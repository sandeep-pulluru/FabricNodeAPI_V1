/**
 * Copyright 2017 IBM All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an 'AS IS' BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
var util = require('util');
var fs = require('fs');
var path = require('path');
var config = require('../config.json');
var helper = require('./helper.js');
var logger = helper.getLogger('Channel-Config');
var superagent = require('superagent');
var agent = require('superagent-promise')(require('superagent'), Promise);

var config_proto = null;
var original_config_proto = null;
var original_config_json = null;
var updated_config_proto = null;
var updated_config_json = null;

var channelConfig = function(channelName, username, orgName, fnName) {
    logger.debug('\n====== Updating Channel Config \'' + channelName + '\' ======\n');
    var client = helper.getClientForOrg(orgName);
    var channel = helper.getChannelForOrg(orgName, channelName);

    //Acting as a client in the given organization provided with "orgName" param
    return helper.getOrgAdmin(orgName).then((admin) => {
        logger.debug(util.format('Successfully acquired admin user for the organization "%s"', orgName));
        return channel.getChannelConfig()
            .then((config_envelope) => {
                logger.debug('Successfully read the current channel configuration');
                // we just need the config from the envelope and configtxlator
                // works with bytes
                original_config_proto = config_envelope.config.toBuffer();

                fs.writeFileSync(path.join(__dirname, '../artifacts/channel/original_config.proto'), original_config_proto);
                // lets get the config converted into JSON, so we can edit JSON to
                // make our changes
                return agent.post('http://127.0.0.1:7059/protolator/decode/common.Config',
                        original_config_proto)
                    .buffer();

            }).then((response) => {
                logger.debug('Successfully decoded the current configuration config proto into JSON');
                original_config_json = response.text.toString();

                if (fnName == 'AddOrg') {
                    //get Org3 JSON and add it to the original config JSON
                    var org3_json = JSON.parse(fs.readFileSync(path.join(__dirname, '../artifacts/channel-update-json/org3.json')));
                    updated_config_json = JSON.parse(original_config_json);
                    updated_config_json.channel_group.groups.Application.groups["Org3MSP"] = org3_json.Org3MSP;

                    //set the admin cert and root cert for org3
                    var admin_cert = fs.readFileSync(path.join(__dirname, '../artifacts/crypto-config/peerOrganizations/org3.example.com/msp/admincerts/Admin@org3.example.com-cert.pem'), 'utf8');
                    admin_cert = new Buffer(admin_cert).toString('base64');
                    updated_config_json.channel_group.groups.Application.groups.Org3MSP.values.MSP.value.config.admins.push(admin_cert);

                    var root_cert = fs.readFileSync(path.join(__dirname, '../artifacts/crypto-config/peerOrganizations/org3.example.com/msp/cacerts/ca.org3.example.com-cert.pem'), 'utf8');
                    root_cert = new Buffer(root_cert).toString('base64');
                    updated_config_json.channel_group.groups.Application.groups.Org3MSP.values.MSP.value.config.root_certs.push(root_cert);
                } else if (fnName == 'RemoveOrg') {
                    updated_config_json = JSON.parse(original_config_json);
                    delete updated_config_json.channel_group.groups.Application.groups["Org3MSP"];
                }

                logger.debug('Successfully read in the udpated JSON config');

                // lets get the updated JSON encoded
                return agent.post('http://127.0.0.1:7059/protolator/encode/common.Config',
                        JSON.stringify(updated_config_json))
                    .buffer();
            }).then((response) => {
                logger.debug('Successfully encoded the updated config from the JSON input');
                updated_config_proto = response.body;

                fs.writeFileSync(path.join(__dirname, '../artifacts/channel/updated_config.proto'), updated_config_proto);

                return agent.post('http://127.0.0.1:7059/configtxlator/compute/update-from-configs')
                    .buffer()
                    .field('channel', channelName)
                    .attach('original', path.join(__dirname, '../artifacts/channel/original_config.proto'))
                    .attach('updated', path.join(__dirname, '../artifacts/channel/updated_config.proto'));
            }).then((response) => {
                logger.debug('Successfully had configtxlator compute the updated config object');
                config_proto = response.body;

                var signatures = [];
                let signature = client.signChannelConfig(config_proto);
                signatures.push(signature);;

                let request = {
                    config: config_proto,
                    name: channelName,
                    orderer: channel.getOrderers()[0],
                    txId: client.newTransactionID()
                };

                if (fnName == 'AddOrg') {
                    var client2 = helper.getClientForOrg("org2");
                    return helper.getOrgAdmin("org2").then((admin) => {
                        let signature2 = client2.signChannelConfig(config_proto);
                        signatures.push(signature2);
                    }).then(() => {
                        request.signatures = signatures;
                        return client.updateChannel(request);
                    }).then((response) => {
                        logger.debug(' response ::%j', response);
                        if (response && response.status === 'SUCCESS') {
                            logger.debug('Successfully updated the channel.');
                            let response = {
                                success: true,
                                message: 'Channel \'' + channelName + '\' update Successfully'
                            };
                            return response;
                        } else {
                            logger.error('\n!!!!!!!!! Failed to update the channel \'' + channelName +
                                '\' !!!!!!!!!\n\n');
                            throw new Error('Failed to update the channel \'' + channelName + '\'');
                        }
                    });
                } else if (fnName == 'RemoveOrg') {
                    var client2 = helper.getClientForOrg("org2");
                    var client3 = helper.getClientForOrg("org3");

                    return helper.getOrgAdmin("org2").then((admin) => {
                        let signature2 = client2.signChannelConfig(config_proto);
                        signatures.push(signature2);
                        return helper.getOrgAdmin("org3");
                    }).then(() => {
                        let signature3 = client3.signChannelConfig(config_proto);
                        signatures.push(signature3);
                        request.signatures = signatures;
                        return client.updateChannel(request);
                    }).then((response) => {
                        logger.debug(' response ::%j', response);
                        if (response && response.status === 'SUCCESS') {
                            logger.debug('Successfully updated the channel.');
                            let response = {
                                success: true,
                                message: 'Channel \'' + channelName + '\' update Successfully'
                            };
                            return response;
                        } else {
                            logger.error('\n!!!!!!!!! Failed to update the channel \'' + channelName +
                                '\' !!!!!!!!!\n\n');
                            throw new Error('Failed to update the channel \'' + channelName + '\'');
                        }
                    });
                }
            })
    });
};


exports.channelConfig = channelConfig;