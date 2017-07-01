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
'use strict';
var log4js = require('log4js');
var logger = log4js.getLogger('SampleWebApp');
var express = require('express');
var session = require('express-session');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var http = require('http');
var util = require('util');
var app = express();
var expressJWT = require('express-jwt');
var jwt = require('jsonwebtoken');
var bearerToken = require('express-bearer-token');
var cors = require('cors');
var config = require('./config.json');
var helper = require('./app/helper.js');
var channels = require('./app/create-channel.js');
var join = require('./app/join-channel.js');
var install = require('./app/install-chaincode.js');
var instantiate = require('./app/instantiate-chaincode.js');
var invoke = require('./app/invoke-transaction.js');
var query = require('./app/query.js');
var configtxlator = require('./app/channel-config.js');
var host = process.env.HOST || config.host;
var port = process.env.PORT || config.port;
///////////////////////////////////////////////////////////////////////////////
//////////////////////////////// SET CONFIGURATONS ////////////////////////////
///////////////////////////////////////////////////////////////////////////////
app.options('*', cors());
app.use(cors());
//support parsing of application/json type post data
app.use(bodyParser.json());
//support parsing of application/x-www-form-urlencoded post data
app.use(bodyParser.urlencoded({
    extended: false
}));
// set secret variable
app.set('secret', 'thisismysecret');
app.use(expressJWT({
    secret: 'thisismysecret'
}).unless({
    path: ['/users']
}));
app.use(bearerToken());
app.use(function(req, res, next) {
    if (req.originalUrl.indexOf('/users') >= 0) {
        return next();
    }

    var token = req.token;
    jwt.verify(token, app.get('secret'), function(err, decoded) {
        if (err) {
            res.send({
                success: false,
                message: 'Failed to authenticate token. Make sure to include the ' +
                    'token returned from /users call in the authorization header ' +
                    ' as a Bearer token'
            });
            return;
        } else {
            // add the decoded user name and org name to the request object
            // for the downstream code to use
            req.username = decoded.username;
            req.orgname = decoded.orgName;
            logger.debug(util.format('Decoded from JWT token: username - %s, orgname - %s', decoded.username, decoded.orgName));
            return next();
        }
    });
});

///////////////////////////////////////////////////////////////////////////////
//////////////////////////////// START SERVER /////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
var server = http.createServer(app).listen(port, function() {});
logger.info('****************** SERVER STARTED ************************');
logger.info('**************  http://' + host + ':' + port +
    '  ******************');
server.timeout = 240000;

function getErrorMessage(field) {
    var response = {
        success: false,
        message: field + ' field is missing or Invalid in the request'
    };
    return response;
}

///////////////////////////////////////////////////////////////////////////////
///////////////////////// REST ENDPOINTS START HERE ///////////////////////////
///////////////////////////////////////////////////////////////////////////////
// Register and enroll user
app.post('/users', function(req, res) {
    var username = req.body.username;
    var orgName = req.body.orgName;
    logger.debug('End point : /users');
    logger.debug('User name : ' + username);
    logger.debug('Org name  : ' + orgName);
    if (!username) {
        res.json(getErrorMessage('\'username\''));
        return;
    }
    if (!orgName) {
        res.json(getErrorMessage('\'orgName\''));
        return;
    }
    var token = jwt.sign({
        exp: Math.floor(Date.now() / 1000) + parseInt(config.jwt_expiretime),
        username: username,
        orgName: orgName
    }, app.get('secret'));
    helper.getRegisteredUsers(username, orgName, true).then(function(response) {
        if (response && typeof response !== 'string') {
            response.token = token;
            res.json(response);
        } else {
            res.json({
                success: false,
                message: response
            });
        }
    });
});
// Revoke user
app.get('/revoke', function(req, res) {
    logger.info('<<<<<<<<<<<<<<<<< R E V O K E  U S E R >>>>>>>>>>>>>>>>>');
    let username = req.username;
    let orgName = req.orgname;
    logger.debug('User name : ' + username);
    logger.debug('Org name  : ' + orgName);
    helper.revokeUser(username, orgName).then(function(response) {
        if (response && response.success == true) {
            res.json('successfully revoked user \'' + username + '\'');
        } else {
            res.json(response);
        }
    });
});
// Create/Update Channel
app.post('/channels', function(req, res) {
    var configUpdate = req.body.configUpdate;
    if (!configUpdate) {
        logger.info('<<<<<<<<<<<<<<<<< C R E A T E  C H A N N E L >>>>>>>>>>>>>>>>>');
    } else {
        logger.info('<<<<<<<<<<<<<<<<< U P D A T E  C H A N N E L >>>>>>>>>>>>>>>>>');
    }
    var channelName = req.body.channelName;
    var channelConfigPath = req.body.channelConfigPath;
    logger.debug('Channel name : ' + channelName);
    logger.debug('channelConfigPath : ' + channelConfigPath); //../artifacts/channel/mychannel.tx
    if (!channelName) {
        res.json(getErrorMessage('\'channelName\''));
        return;
    }
    if (!channelConfigPath) {
        res.json(getErrorMessage('\'channelConfigPath\''));
        return;
    }

    channels.createChannel(channelName, channelConfigPath, configUpdate, req.username, req.orgname)
        .then(function(message) {
            res.send(message);
        });
});
// Join Channel
app.post('/channels/:channelName/peers', function(req, res) {
    logger.info('<<<<<<<<<<<<<<<<< J O I N  C H A N N E L >>>>>>>>>>>>>>>>>');
    var channelName = req.params.channelName;
    var peers = req.body.peers;
    logger.debug('channelName : ' + channelName);
    logger.debug('peers : ' + peers);
    if (!channelName) {
        res.json(getErrorMessage('\'channelName\''));
        return;
    }
    if (!peers || peers.length == 0) {
        res.json(getErrorMessage('\'peers\''));
        return;
    }

    join.joinChannel(channelName, peers, req.username, req.orgname)
        .then(function(message) {
            res.send(message);
        });
});
// Install chaincode on target peers
app.post('/chaincodes', function(req, res) {
    logger.debug('==================== INSTALL CHAINCODE ==================');
    var peers = req.body.peers;
    var chaincodeName = req.body.chaincodeName;
    var chaincodePath = req.body.chaincodePath;
    var chaincodeVersion = req.body.chaincodeVersion;
    logger.debug('peers : ' + peers); // target peers list
    logger.debug('chaincodeName : ' + chaincodeName);
    logger.debug('chaincodePath  : ' + chaincodePath);
    logger.debug('chaincodeVersion  : ' + chaincodeVersion);
    if (!peers || peers.length == 0) {
        res.json(getErrorMessage('\'peers\''));
        return;
    }
    if (!chaincodeName) {
        res.json(getErrorMessage('\'chaincodeName\''));
        return;
    }
    if (!chaincodePath) {
        res.json(getErrorMessage('\'chaincodePath\''));
        return;
    }
    if (!chaincodeVersion) {
        res.json(getErrorMessage('\'chaincodeVersion\''));
        return;
    }

    install.installChaincode(peers, chaincodeName, chaincodePath, chaincodeVersion, req.username, req.orgname)
        .then(function(message) {
            res.send(message);
        });
});
// Update channel config using configtxlator
app.post('/channels/:channelName/channelconfig', function(req, res) {
    logger.debug('==================== CHANNEL CONFIG ==================');

    var channelName = req.params.channelName;
    var functionName = req.body.functionName;

    logger.debug('channelName  : ' + channelName);
    logger.debug('functionName  : ' + functionName);

    if (!functionName) {
        res.json(getErrorMessage('\'functionName\''));
        return;
    }

    configtxlator.channelConfig(channelName, req.username, req.orgname, functionName)
        .then(function(message) {
            res.send(message);
        });
});
// Instantiate chaincode on target peers
app.post('/channels/:channelName/chaincodes', function(req, res) {
    var isUpgrade = req.body.isupgrade;
    var peers;
    var chaincodePath;
    if (!isUpgrade) {
        logger.debug('==================== INSTANTIATE CHAINCODE ==================');
    } else {
        logger.debug('==================== UPGRADE CHAINCODE ==================');
        peers = req.body.peers;
        if (!peers || peers.length == 0) {
            res.json(getErrorMessage('\'peers\''));
            return;
        }
        chaincodePath = req.body.chaincodePath;
        if (!chaincodePath) {
            res.json(getErrorMessage('\'chaincodePath\''));
            return;
        }
    }

    var chaincodeName = req.body.chaincodeName;
    var chaincodeVersion = req.body.chaincodeVersion;
    var channelName = req.params.channelName;
    var functionName = req.body.functionName;
    var args = req.body.args;
    logger.debug('channelName  : ' + channelName);
    logger.debug('chaincodeName : ' + chaincodeName);
    logger.debug('chaincodeVersion  : ' + chaincodeVersion);
    logger.debug('functionName  : ' + functionName);
    logger.debug('args  : ' + args);
    if (!chaincodeName) {
        res.json(getErrorMessage('\'chaincodeName\''));
        return;
    }
    if (!chaincodeVersion) {
        res.json(getErrorMessage('\'chaincodeVersion\''));
        return;
    }
    if (!channelName) {
        res.json(getErrorMessage('\'channelName\''));
        return;
    }
    if (!functionName) {
        res.json(getErrorMessage('\'functionName\''));
        return;
    }
    if (!args) {
        res.json(getErrorMessage('\'args\''));
        return;
    }
    if (isUpgrade) {
        install.installChaincode(peers, chaincodeName, chaincodePath, chaincodeVersion, req.username, req.orgname)
            .then(function(message) {
                // TODO: Avoid this hardcoding ?
                if (!message || !message.includes('Successfully Installed chaincode')) {
                    res.send('Chaincode upgarde failed while installing chaincode with version ' + chaincodeVersion);
                } else {
                    instantiate.instantiateChaincode(channelName, chaincodeName, chaincodeVersion, functionName, args, req.username, req.orgname, isUpgrade)
                        .then(function(message) {
                            res.send(message);
                        });
                }
            });
    } else {
        instantiate.instantiateChaincode(channelName, chaincodeName, chaincodeVersion, functionName, args, req.username, req.orgname)
            .then(function(message) {
                res.send(message);
            });
    }
});
// Invoke transaction on chaincode on target peers
app.post('/channels/:channelName/chaincodes/:chaincodeName', function(req, res) {
    logger.debug('==================== INVOKE ON CHAINCODE ==================');
    var peers = req.body.peers;
    var eventpeers = req.body.eventpeers;
    var chaincodeName = req.params.chaincodeName;
    var channelName = req.params.channelName;
    var fcn = req.body.fcn;
    var args = req.body.args;
    logger.debug('channelName  : ' + channelName);
    logger.debug('chaincodeName : ' + chaincodeName);
    logger.debug('fcn  : ' + fcn);
    logger.debug('args  : ' + args);
    if (!peers || peers.length == 0) {
        res.json(getErrorMessage('\'peers\''));
        return;
    }
    if (!eventpeers || eventpeers.length == 0) {
        eventpeers = peers;
    }
    if (!chaincodeName) {
        res.json(getErrorMessage('\'chaincodeName\''));
        return;
    }
    if (!channelName) {
        res.json(getErrorMessage('\'channelName\''));
        return;
    }
    if (!fcn) {
        res.json(getErrorMessage('\'fcn\''));
        return;
    }
    if (!args) {
        res.json(getErrorMessage('\'args\''));
        return;
    }

    invoke.invokeChaincode(peers, eventpeers, channelName, chaincodeName, fcn, args, req.username, req.orgname)
        .then(function(message) {
            res.send(message);
        });
});
// Query on chaincode on target peers
app.get('/channels/:channelName/chaincodes/:chaincodeName', function(req, res) {
    logger.debug('==================== QUERY BY CHAINCODE ==================');
    var channelName = req.params.channelName;
    var chaincodeName = req.params.chaincodeName;
    let args = req.query.args;
    let peer = req.query.peer;
    let fcn = req.query.fcn;

    logger.debug('channelName : ' + channelName);
    logger.debug('chaincodeName : ' + chaincodeName);
    logger.debug('fcn  : ' + fcn);
    logger.debug('args : ' + args);

    if (!chaincodeName) {
        res.json(getErrorMessage('\'chaincodeName\''));
        return;
    }
    if (!channelName) {
        res.json(getErrorMessage('\'channelName\''));
        return;
    }
    if (!fcn) {
        res.json(getErrorMessage('\'fcn\''));
        return;
    }
    if (!args) {
        res.json(getErrorMessage('\'args\''));
        return;
    }
    //args = args.replace(/'/g, '"');
    args = JSON.parse('["' + args + '"]');
    logger.debug('args : ' + args);

    query.queryChaincode(peer, channelName, chaincodeName, fcn, args, req.username, req.orgname)
        .then(function(message) {
            res.send(message);
        });
});
//  Query Get Block by BlockNumber
app.get('/channels/:channelName/blocks/:blockId', function(req, res) {
    logger.debug('==================== GET BLOCK BY NUMBER ==================');
    let blockId = req.params.blockId;
    let peer = req.query.peer;
    let channelName = req.params.channelName;
    logger.debug('channelName : ' + channelName);
    logger.debug('BlockID : ' + blockId);
    logger.debug('Peer : ' + peer);
    if (!blockId) {
        res.json(getErrorMessage('\'blockId\''));
        return;
    }

    query.getBlockByNumber(peer, blockId, req.username, req.orgname, channelName)
        .then(function(message) {
            res.send(message);
        });
});
// Query Get Transaction by Transaction ID
app.get('/channels/:channelName/transactions/:trxnId', function(req, res) {
    logger.debug(
        '================ GET TRANSACTION BY TRANSACTION_ID ======================'
    );

    let trxnId = req.params.trxnId;
    let peer = req.query.peer;
    let channelName = req.params.channelName;
    logger.debug('channelName : ' + channelName);
    if (!trxnId) {
        res.json(getErrorMessage('\'trxnId\''));
        return;
    }

    query.getTransactionByID(peer, trxnId, req.username, req.orgname, channelName)
        .then(function(message) {
            res.send(message);
        });
});
// Query Get Block by Hash
app.get('/channels/:channelName/blocks', function(req, res) {
    logger.debug('================ GET BLOCK BY HASH ======================');

    let hash = req.query.hash;
    let peer = req.query.peer;
    let channelName = req.params.channelName;
    logger.debug('channelName : ' + channelName);
    if (!hash) {
        res.json(getErrorMessage('\'hash\''));
        return;
    }

    query.getBlockByHash(peer, hash, req.username, req.orgname, channelName).then(
        function(message) {
            res.send(message);
        });
});
//Query for Channel Information
app.get('/channels/:channelName', function(req, res) {
    logger.debug(
        '================ GET CHANNEL INFORMATION ======================');
    let peer = req.query.peer;
    let channelName = req.params.channelName;
    logger.debug('channelName : ' + channelName);
    query.getChannelInfo(peer, req.username, req.orgname, channelName).then(
        function(message) {
            res.send(message);
        });
});
// Query to fetch all Installed/instantiated chaincodes
app.get('/chaincodes', function(req, res) {
    var peer = req.query.peer;
    var installType = req.query.type;
    var channelName = req.query.channel;
    //TODO: add Constnats
    if (installType === 'installed') {
        logger.debug(
            '================ GET INSTALLED CHAINCODES ======================');
    } else {
        logger.debug(
            '================ GET INSTANTIATED CHAINCODES ======================');
    }

    query.getInstalledChaincodes(peer, installType, req.username, req.orgname, channelName)
        .then(function(message) {
            res.send(message);
        });
});
// Query to fetch channels
app.get('/channels', function(req, res) {
    logger.debug('================ GET CHANNELS ======================');
    logger.debug('peer: ' + req.query.peer);
    var peer = req.query.peer;
    if (!peer) {
        res.json(getErrorMessage('\'peer\''));
        return;
    }

    query.getChannels(peer, req.username, req.orgname)
        .then(function(
            message) {
            res.send(message);
        });
});

// Query to get BlockCount on a channel
app.get('/channels/:channelName/height', function(req, res) {
    logger.debug('================ GET BLOCK HEIGHT OF CHANNEL ======================');
    let peer = req.query.peer;
    let channelName = req.params.channelName;
    logger.debug('channelName : ' + channelName);

    query.getChannelHeight(peer, req.username, req.orgname, channelName).then(
        function(message) {
            res.send(message);
        });
});