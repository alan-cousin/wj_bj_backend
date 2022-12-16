
# WhiteJoker BlackJack - Solidity SmatrContract(On Polygon) + Unity Client + ChainSafeSDK + Moralis Backend

An example game of Blackjack that uses an EVM contract written in Solidity as backend, and Unity as a client

Specifically, the game is [Normal BlackJack](https://bicyclecards.com/how-to-play/blackjack/) with some simplifications. There is no splitting pairs and insurance.

# Development

## Running the Unity client

```
# Download the project
git clone https://github.com/alan-cousin/wj_bj_frontend.git
```
Open the Unity project . Open the `Scenes/Main` scene and run/build it.

## Running the Node Server
```
# Download the project
git clone https://github.com/alan-cousin/wj_bj_backend.git

```
```
# Configuration on index.js
# Set Moralis API key
const MORALIS_API_KEY = "---"
# Set Owner Private Key
const owner_pk = "---"
# Set RPC URL of Chain
const RPC_URL = "https://matic-mumbai.chainstacklabs.com"
```

```
# Run Server
npm install
npm start
```
License
----

MIT

Third-party notice
----

