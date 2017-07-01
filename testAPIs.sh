#!/bin/bash

jq --version > /dev/null 2>&1
if [ $? -ne 0 ]; then
	echo "Please Install 'jq' https://stedolan.github.io/jq/ to execute this script"
	echo
	exit 1
fi
starttime=$(date +%s)

echo "POST request Enroll user 'Jim' on Org1  ..."
echo
ORG1_TOKEN=$(curl -s -X POST \
  http://localhost:4000/users \
  -H "content-type: application/x-www-form-urlencoded" \
  -d 'username=Jim&orgName=org1')
echo $ORG1_TOKEN
ORG1_TOKEN=$(echo $ORG1_TOKEN | jq ".token" | sed "s/\"//g")
echo
echo "ORG1 token is $ORG1_TOKEN"
echo

echo "POST request Enroll user 'Barry' on Org2 ..."
echo
ORG2_TOKEN=$(curl -s -X POST \
  http://localhost:4000/users \
  -H "content-type: application/x-www-form-urlencoded" \
  -d 'username=Barry&orgName=org2')
echo $ORG2_TOKEN
ORG2_TOKEN=$(echo $ORG2_TOKEN | jq ".token" | sed "s/\"//g")
echo
echo "ORG2 token is $ORG2_TOKEN"
echo

echo "POST request Enroll user 'Sandy' on Org3 ..."
echo
ORG3_TOKEN=$(curl -s -X POST \
  http://localhost:4000/users \
  -H "content-type: application/x-www-form-urlencoded" \
  -d 'username=Sandy&orgName=org3')
echo $ORG3_TOKEN
ORG3_TOKEN=$(echo $ORG3_TOKEN | jq ".token" | sed "s/\"//g")
echo
echo "ORG3 token is $ORG3_TOKEN"
echo

# echo "POST request Enroll user 'Ratz' on Org1  ..."
# echo
# TEMP_TOKEN=$(curl -s -X POST \
#   http://localhost:4000/users \
#   -H "content-type: application/x-www-form-urlencoded" \
#   -d 'username=Ratz&orgName=org1')
# TEMP_TOKEN=$(echo $TEMP_TOKEN | jq ".token" | sed "s/\"//g")
# echo
# echo "GET request to revoke user 'Ratz' on Org1  ..."
# echo
# curl -s -X GET \
#   "http://localhost:4000/revoke" \
#   -H "authorization: Bearer $TEMP_TOKEN" \
#   -H "content-type: application/json"
# echo
# echo

echo
echo "POST request Create channel  ..."
echo
curl -s -X POST \
  http://localhost:4000/channels \
  -H "authorization: Bearer $ORG1_TOKEN" \
  -H "content-type: application/json" \
  -d '{
	"channelName":"mychannel1",
	"channelConfigPath":"../artifacts/channel/mychannel1.tx",
	"configUpdate":false
}'
echo
echo
sleep 10
echo "POST request Join channel on Org1"
echo
curl -s -X POST \
  http://localhost:4000/channels/mychannel1/peers \
  -H "authorization: Bearer $ORG1_TOKEN" \
  -H "content-type: application/json" \
  -d '{
	"peers": ["localhost:7051","localhost:8051"]
}'
echo
echo

echo "POST request Join channel on Org2"
echo
curl -s -X POST \
  http://localhost:4000/channels/mychannel1/peers \
  -H "authorization: Bearer $ORG2_TOKEN" \
  -H "content-type: application/json" \
  -d '{
	"peers": ["localhost:9051","localhost:10051"]
}'
echo
echo

# echo
# echo "POST request Create channel  ..."
# echo
# curl -s -X POST \
#   http://localhost:4000/channels \
#   -H "authorization: Bearer $ORG1_TOKEN" \
#   -H "content-type: application/json" \
#   -d '{
# 	"channelName":"mychannel2",
# 	"channelConfigPath":"../artifacts/channel/mychannel2.tx"
# }'
# echo
# echo
# sleep 10

# echo
# echo "POST request Join channel on Org1"
# echo
# curl -s -X POST \
#   http://localhost:4000/channels/mychannel2/peers \
#   -H "authorization: Bearer $ORG1_TOKEN" \
#   -H "content-type: application/json" \
#   -d '{
# 	"peers": ["localhost:7051","localhost:8051"]
# }'
# echo
# echo

# echo "POST request Join channel on Org2"
# echo
# curl -s -X POST \
#   http://localhost:4000/channels/mychannel2/peers \
#   -H "authorization: Bearer $ORG2_TOKEN" \
#   -H "content-type: application/json" \
#   -d '{
# 	"peers": ["localhost:9051","localhost:10051"]
# }'
# echo
# echo

echo "POST Install chaincode on Org1"
echo
curl -s -X POST \
  http://localhost:4000/chaincodes \
  -H "authorization: Bearer $ORG1_TOKEN" \
  -H "content-type: application/json" \
  -d '{
	"peers": ["localhost:7051","localhost:8051"],
	"chaincodeName":"mycc",
	"chaincodePath":"github.com/uniqueKeyValue",
	"chaincodeVersion":"v0"
}'
echo
echo

echo "POST Install chaincode on Org2"
echo
curl -s -X POST \
  http://localhost:4000/chaincodes \
  -H "authorization: Bearer $ORG2_TOKEN" \
  -H "content-type: application/json" \
  -d '{
	"peers": ["localhost:9051","localhost:10051"],
	"chaincodeName":"mycc",
	"chaincodePath":"github.com/uniqueKeyValue",
	"chaincodeVersion":"v0"
}'
echo
echo

echo "POST Install chaincode on Org3"
echo
curl -s -X POST \
	http://localhost:4000/chaincodes \
	-H "authorization: Bearer $ORG3_TOKEN" \
	-H "content-type: application/json" \
	-d '{
	"peers": ["localhost:11051","localhost:12051"],
	"chaincodeName":"mycc",
	"chaincodePath":"github.com/uniqueKeyValue",
	"chaincodeVersion":"v0"
}'
echo
echo

echo "POST instantiate chaincode on peer1 of Org1 on mychannel1"
echo
curl -s -X POST \
  http://localhost:4000/channels/mychannel1/chaincodes \
  -H "authorization: Bearer $ORG1_TOKEN" \
  -H "content-type: application/json" \
  -d '{
	"chaincodeName":"mycc",
	"chaincodeVersion":"v0",
	"functionName":"init",
	"args":[""]
}'
echo
echo

# echo
# echo "POST instantiate chaincode on peer1 of Org1 on mychannel2"
# echo
# curl -s -X POST \
#   http://localhost:4000/channels/mychannel2/chaincodes \
#   -H "authorization: Bearer $ORG1_TOKEN" \
#   -H "content-type: application/json" \
#   -d '{
# 	"chaincodeName":"mycc",
# 	"chaincodeVersion":"v0",
# 	"functionName":"init",
# 	"args":[""]
# }'
# echo
# echo

# echo "POST invoke chaincode on peers of Org1"
# echo
# TRX_ID=$(curl -s -X POST \
#   http://localhost:4000/channels/mychannel1/chaincodes/mycc \
#   -H "authorization: Bearer $ORG1_TOKEN" \
#   -H "content-type: application/json" \
#   -d '{
# 	"peers": ["localhost:7051"], 
#   "eventpeers": ["localhost:7051", "localhost:8051"], 
# 	"fcn":"put",
# 	"args":["a","10"]
# }')
# echo "Transacton ID is $TRX_ID"
# echo
# sleep 10

# echo "POST invoke chaincode on peers of Org1"
# echo
# TRX_ID=$(curl -s -X POST \
#   http://localhost:4000/channels/mychannel1/chaincodes/mycc \
#   -H "authorization: Bearer $ORG1_TOKEN" \
#   -H "content-type: application/json" \
#   -d '{
# 	"peers": ["localhost:7051"], 
#   "eventpeers": ["localhost:7051", "localhost:8051"], 
# 	"fcn":"put",
# 	"args":["b","10"]
# }')
# echo "Transacton ID is $TRX_ID"
# echo
# sleep 10

echo "POST invoke chaincode on peers of Org2"
echo
TRX_ID=$(curl -s -X POST \
  http://localhost:4000/channels/mychannel1/chaincodes/mycc \
  -H "authorization: Bearer $ORG2_TOKEN" \
  -H "content-type: application/json" \
  -d '{
	"peers": ["localhost:9051"], 
  "eventpeers": ["localhost:9051", "localhost:10051"], 
	"fcn":"put",
	"args":["a","10"]
}')
echo "Transacton ID is $TRX_ID"
echo
sleep 10

# echo "POST invoke chaincode on peers of Org1"
# echo
# TRX_ID=$(curl -s -X POST \
#   http://localhost:4000/channels/mychannel1/chaincodes/mycc \
#   -H "authorization: Bearer $ORG1_TOKEN" \
#   -H "content-type: application/json" \
#   -d '{
# 	"peers": ["localhost:7051"], 
#   "eventpeers": ["localhost:7051", "localhost:8051"], 
# 	"fcn":"put",
# 	"args":["c","10"]
# }')
# echo "Transacton ID is $TRX_ID"
# echo
# sleep 10



# echo "POST invoke chaincode on peers of Org1"
# echo
# TRX_ID=$(curl -s -X POST \
#   http://localhost:4000/channels/mychannel1/chaincodes/mycc \
#   -H "authorization: Bearer $ORG2_TOKEN" \
#   -H "content-type: application/json" \
#   -d '{
# 	"peers": ["localhost:9051"], 
#   "eventpeers": ["localhost:9051", "localhost:10051"], 
# 	"fcn":"put",
# 	"args":["org1","10"]
# }')
# echo "Transacton ID is $TRX_ID"
# echo
# echo
# sleep 10

# echo "GET query chaincode on peer1 of Org3"
# echo
# curl -s -X GET \
#   "http://localhost:4000/channels/mychannel1/chaincodes/mycc?peer=peer1&fcn=get&args=%5B%22org1%22%5D" \
#   -H "authorization: Bearer $ORG3_TOKEN" \
#   -H "content-type: application/json"
# echo
# echo

# echo "POST invoke chaincode on peers of Org3"
# echo
# TRX_ID5=$(curl -s -X POST \
# 	http://localhost:4000/channels/mychannel1/chaincodes/mycc \
# 	-H "authorization: Bearer $ORG3_TOKEN" \
# 	-H "content-type: application/json" \
# 	-d '{
#   "peers": ["localhost:7051"], 
#   "eventpeers": ["localhost:11051", "localhost:12051"],
#   "fcn":"put",
# 	"args":["org3","putanotherandomvalue-org3"]
# }')
# echo "Transacton ID is $TRX_ID5"
# echo
# exit

echo "GET query chaincode on peer0 of Org1"
echo
curl -s -X GET \
  "http://localhost:4000/channels/mychannel1/chaincodes/mycc?peer=peer0&fcn=get&args=a" \
  -H "authorization: Bearer $ORG1_TOKEN" \
  -H "content-type: application/json"
echo
echo

echo "POST request to Update Channel Config - Add Org"
echo
curl -s -X POST \
	http://localhost:4000/channels/mychannel1/channelconfig \
	-H "authorization: Bearer $ORG1_TOKEN" \
	-H "content-type: application/json" \
	-d '{
	"functionName":"AddOrg"
}'
echo
echo
sleep 15

echo "POST request Join channel on Org3"
echo
curl -s -X POST \
	http://localhost:4000/channels/mychannel1/peers \
	-H "authorization: Bearer $ORG3_TOKEN" \
	-H "content-type: application/json" \
	-d '{
	"peers": ["localhost:11051","localhost:12051"]
}'
echo
echo
sleep 15

echo "GET query chaincode on peer1 of Org3"
echo
curl -s -X GET \
  "http://localhost:4000/channels/mychannel1/chaincodes/mycc?peer=peer0&fcn=get&args=a" \
  -H "authorization: Bearer $ORG3_TOKEN" \
  -H "content-type: application/json"
echo
echo

echo "POST invoke chaincode on peers of Org3"
echo
TRX_ID3=$(curl -s -X POST \
	http://localhost:4000/channels/mychannel1/chaincodes/mycc \
	-H "authorization: Bearer $ORG3_TOKEN" \
	-H "content-type: application/json" \
	-d '{	  
  "peers": ["localhost:7051"],
  "eventpeers": ["localhost:11051", "localhost:12051"],
  "fcn":"put",
	"args":["a","20"]
}')
echo "Transacton ID is $TRX_ID3"
echo
sleep 10

echo "GET query chaincode on peer1 of Org3"
echo
curl -s -X GET \
  "http://localhost:4000/channels/mychannel1/chaincodes/mycc?peer=peer0&fcn=get&args=a" \
  -H "authorization: Bearer $ORG3_TOKEN" \
  -H "content-type: application/json"
echo
echo
sleep 10

echo "GET query chaincode on peer1 of Org1"
echo
curl -s -X GET \
  "http://localhost:4000/channels/mychannel1/chaincodes/mycc?peer=peer0&fcn=get&args=a" \
  -H "authorization: Bearer $ORG1_TOKEN" \
  -H "content-type: application/json"
echo
echo

echo "POST request to Update Channel Config - Remove Org"
echo
curl -s -X POST \
	http://localhost:4000/channels/mychannel1/channelconfig \
	-H "authorization: Bearer $ORG1_TOKEN" \
	-H "content-type: application/json" \
	-d '{
	"functionName":"RemoveOrg"
}'
echo
echo
sleep 15

echo "POST invoke chaincode on peers of Org1"
echo
TRX_ID4=$(curl -s -X POST \
  http://localhost:4000/channels/mychannel1/chaincodes/mycc \
  -H "authorization: Bearer $ORG1_TOKEN" \
  -H "content-type: application/json" \
  -d '{
	"peers": ["localhost:7051"], 
  "eventpeers": ["localhost:7051", "localhost:8051"], 
	"fcn":"put",
	"args":["a","30"]
}')
echo "Transacton ID is $TRX_ID4"
echo
echo
sleep 10

echo "GET query chaincode on peer0 of Org1"
echo
curl -s -X GET \
  "http://localhost:4000/channels/mychannel1/chaincodes/mycc?peer=peer0&fcn=get&args=a" \
  -H "authorization: Bearer $ORG1_TOKEN" \
  -H "content-type: application/json"
echo
echo

echo "GET query chaincode on peer0 of Org2"
echo
curl -s -X GET \
  "http://localhost:4000/channels/mychannel1/chaincodes/mycc?peer=peer0&fcn=get&args=a" \
  -H "authorization: Bearer $ORG2_TOKEN" \
  -H "content-type: application/json"
echo
echo

echo "GET query chaincode on peer1 of Org3"
echo
curl -s -X GET \
  "http://localhost:4000/channels/mychannel1/chaincodes/mycc?peer=peer0&fcn=get&args=a" \
  -H "authorization: Bearer $ORG3_TOKEN" \
  -H "content-type: application/json"
echo
echo

echo "POST invoke chaincode on peer1 of Org1 with user from Org3"
echo
TRX_ID5=$(curl -s -X POST \
	http://localhost:4000/channels/mychannel1/chaincodes/mycc \
	-H "authorization: Bearer $ORG3_TOKEN" \
	-H "content-type: application/json" \
	-d '{
  "peers": ["localhost:7051"], 
  "eventpeers": ["localhost:11051", "localhost:12051"],
  "fcn":"put",
	"args":["a","40"]
}')
echo "Transacton ID is $TRX_ID5"
echo

echo "GET query chaincode on peer1 of Org3"
echo
curl -s -X GET \
  "http://localhost:4000/channels/mychannel1/chaincodes/mycc?peer=peer0&fcn=get&args=a" \
  -H "authorization: Bearer $ORG3_TOKEN" \
  -H "content-type: application/json"
echo
echo

exit

echo "POST invoke chaincode on peers of Org2"
echo
TRX_ID1=$(curl -s -X POST \
  http://localhost:4000/channels/mychannel1/chaincodes/mycc \
  -H "authorization: Bearer $ORG2_TOKEN" \
  -H "content-type: application/json" \
  -d '{
	"peers": ["localhost:9051", "localhost:10051"],
	"fcn":"put",
	"args":["a","putsomerandomvalue-org2"]
}')
echo "Transacton ID is $TRX_ID1"
echo
echo

echo "GET query chaincode on peer1 of Org1"
echo
curl -s -X GET \
  "http://localhost:4000/channels/mychannel1/chaincodes/mycc?peer=peer1&fcn=get&args=%5B%22org1%22%5D" \
  -H "authorization: Bearer $ORG1_TOKEN" \
  -H "content-type: application/json"
echo
echo

echo "GET query chaincode on peer1 of Org2"
echo
curl -s -X GET \
  "http://localhost:4000/channels/mychannel1/chaincodes/mycc?peer=peer1&fcn=get&args=%5B%22org2%22%5D" \
  -H "authorization: Bearer $ORG2_TOKEN" \
  -H "content-type: application/json"
echo
echo


echo "POST invoke chaincode on peers of Org1 on mychannel2"
echo
TRX_ID2=$(curl -s -X POST \
  http://localhost:4000/channels/mychannel2/chaincodes/mycc \
  -H "authorization: Bearer $ORG1_TOKEN" \
  -H "content-type: application/json" \
  -d '{
	"peers": ["localhost:7051", "localhost:8051"],
	"fcn":"put",
	"args":["ORG1","putsomerandomvalue-ORG1"]
}')
echo "Transacton ID is $TRX_ID2"
echo
echo

echo "POST invoke chaincode on peers of Org2 on mychannel2"
echo
TRX_ID2=$(curl -s -X POST \
  http://localhost:4000/channels/mychannel2/chaincodes/mycc \
  -H "authorization: Bearer $ORG2_TOKEN" \
  -H "content-type: application/json" \
  -d '{
	"peers": ["localhost:9051", "localhost:10051"],
	"fcn":"put",
	"args":["ORG2","putsomerandomvalue-ORG2"]
}')
echo "Transacton ID is $TRX_ID2"
echo
echo

echo "GET query chaincode on peer1 of Org1 on mychannel2"
echo
curl -s -X GET \
  "http://localhost:4000/channels/mychannel2/chaincodes/mycc?peer=peer1&fcn=get&args=%5B%22ORG1%22%5D" \
  -H "authorization: Bearer $ORG1_TOKEN" \
  -H "content-type: application/json"
echo
echo

echo "GET query chaincode on peer1 of Org2 on mychannel2"
echo
curl -s -X GET \
  "http://localhost:4000/channels/mychannel2/chaincodes/mycc?peer=peer1&fcn=get&args=%5B%22ORG2%22%5D" \
  -H "authorization: Bearer $ORG2_TOKEN" \
  -H "content-type: application/json"
echo
echo
printf "\n\n #################### SYSTEM CHAINCODE QUERIES ######################\n\n"
echo "GET query Block by blockNumber"
echo
curl -s -X GET \
  "http://localhost:4000/channels/mychannel1/blocks/1?peer=peer1" \
  -H "authorization: Bearer $ORG1_TOKEN" \
  -H "content-type: application/json"
echo
echo

echo "GET query Transaction by TransactionID"
echo
curl -s -X GET http://localhost:4000/channels/mychannel1/transactions/$TRX_ID?peer=peer1 \
  -H "authorization: Bearer $ORG1_TOKEN" \
  -H "content-type: application/json"
echo
echo

############################################################################
### TODO: What to pass to fetch the Block information
############################################################################
#echo "GET query Block by Hash"
#echo
#hash=????
#curl -s -X GET \
#  "http://localhost:4000/channels/mychannel1/blocks?hash=$hash&peer=peer1" \
#  -H "authorization: Bearer $ORG1_TOKEN" \
#  -H "cache-control: no-cache" \
#  -H "content-type: application/json" \
#  -H "x-access-token: $ORG1_TOKEN"
#echo
#echo

echo "GET query ChainInfo on mychannel1"
echo
curl -s -X GET \
  "http://localhost:4000/channels/mychannel1?peer=peer1" \
  -H "authorization: Bearer $ORG1_TOKEN" \
  -H "content-type: application/json"
echo

echo "GET query ChainInfo on mychannel2"
echo
curl -s -X GET \
  "http://localhost:4000/channels/mychannel2?peer=peer1" \
  -H "authorization: Bearer $ORG2_TOKEN" \
  -H "content-type: application/json"
echo
echo

echo "GET query Installed chaincodes"
echo
curl -s -X GET \
  "http://localhost:4000/chaincodes?peer=peer1&type=installed" \
  -H "authorization: Bearer $ORG1_TOKEN" \
  -H "content-type: application/json"
echo
echo

echo "GET query Instantiated chaincodes on mychannel1"
echo
curl -s -X GET \
  "http://localhost:4000/chaincodes?peer=peer1&type=instantiated&channel=mychannel1" \
  -H "authorization: Bearer $ORG1_TOKEN" \
  -H "content-type: application/json"
echo
echo

echo "GET query Instantiated chaincodes on mychannel2"
echo
curl -s -X GET \
  "http://localhost:4000/chaincodes?peer=peer1&type=instantiated&channel=mychannel2" \
  -H "authorization: Bearer $ORG1_TOKEN" \
  -H "content-type: application/json"
echo
echo

echo "GET query Channels"
echo
curl -s -X GET \
  "http://localhost:4000/channels?peer=peer1" \
  -H "authorization: Bearer $ORG1_TOKEN" \
  -H "content-type: application/json"
echo
echo

echo "GET height of channel mychannel1"
echo
curl -s -X GET \
  "http://localhost:4000/channels/mychannel1/height?peer=peer1" \
  -H "authorization: Bearer $ORG1_TOKEN" \
  -H "content-type: application/json"
echo

echo "GET height of channel mychannel2"
echo
curl -s -X GET \
  "http://localhost:4000/channels/mychannel2/height?peer=peer1" \
  -H "authorization: Bearer $ORG2_TOKEN" \
  -H "content-type: application/json"
echo

echo

echo "POST upgrade chaincode on peer1 of Org1 on mychannel1 with v1"
echo
curl -s -X POST \
  http://localhost:4000/channels/mychannel1/chaincodes \
  -H "authorization: Bearer $ORG1_TOKEN" \
  -H "content-type: application/json" \
  -d '{
	"peers": ["localhost:7051","localhost:8051"],
	"chaincodeName":"mycc",
	"chaincodeVersion":"v1",
	"functionName":"init",
	"chaincodePath":"github.com/uniqueKeyValue",
	"args":[""],
	"isupgrade":"true"
}'
echo
echo "POST invoke chaincode on peers of Org1 on upgraded chaincode mycc v1"
echo
TRX_ID=$(curl -s -X POST \
  http://localhost:4000/channels/mychannel1/chaincodes/mycc \
  -H "authorization: Bearer $ORG1_TOKEN" \
  -H "content-type: application/json" \
  -d '{
	"peers": ["localhost:7051", "localhost:8051"],
	"fcn":"put",
	"args":["org1","upgradedvalue-org1"]
}')
echo "Transacton ID is $TRX_ID"
echo "GET query chaincode on peer1 of Org1 on mychannel1 on upgraded chaincode mycc v1"
echo
curl -s -X GET \
  "http://localhost:4000/channels/mychannel1/chaincodes/mycc?peer=peer1&fcn=get&args=%5B%22org1%22%5D" \
  -H "authorization: Bearer $ORG1_TOKEN" \
  -H "content-type: application/json"
echo
echo
echo "GET query chaincode on peer2 of Org1 on mychannel1 on upgraded chaincode mycc v1"
echo
curl -s -X GET \
  "http://localhost:4000/channels/mychannel1/chaincodes/mycc?peer=peer2&fcn=get&args=%5B%22org1%22%5D" \
  -H "authorization: Bearer $ORG1_TOKEN" \
  -H "content-type: application/json"
echo
printf "\nTotal execution time : $(($(date +%s)-starttime)) secs ...\n\n"
