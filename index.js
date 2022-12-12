const express = require('express')
const formidable = require('express-formidable');
const bj_factory_abi = require("./bj_factory_abi.json")
const bj_game_abi = require("./bj_game_abi.json")
const ethers = require('ethers')
// Import Moralis
const Moralis = require('moralis').default
// Import the EvmChain dataType
const {
    EvmChain
} = require("@moralisweb3/common-evm-utils")

const app = express()
app.use(formidable());
const port = 3000
// Add a variable for the api key, address and chain
const MORALIS_API_KEY = "qUSRFTtgEmYouQteKzxezEdAfhcJ9ZBh1ZsdZUGLtQ6g3RbdBFVBr8SqXfD3Gdhl"
const bgct_game_factory = "0x3611203aE7551bF519D48cA4901b02bFCde7Ca81";//"0x3D89F0e789000D5b898C36EEf5abAB1cfEfC41E2"
const owner_pk = "28682cdeadc10d12b5512132ca19e7503b1b61fdfeaa58552972e6b7a052e33c"
const RPC_URL = "https://matic-mumbai.chainstacklabs.com"
const game_topic = "0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0"
const bgct_game_token = "0x7bA8BFBD7955aEc172279929cD0291889Db354B9"


// Add this a startServer function that initialises Moralis
const startServer = async () => {
    await Moralis.start({
        apiKey: MORALIS_API_KEY,
    })

    app.listen(port, () => {
        console.log(`Example app listening on port ${port}`)
    })
}
async function createGame(user_address, bet_amount) {
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const admin_signer = new ethers.Wallet(owner_pk, provider)
    const bj_game_factory = new ethers.Contract(bgct_game_factory, bj_factory_abi, admin_signer)
    let create_success = false;
    let created_game = ""
    while (!create_success) {
        try {
            console.log("request create game for " + user_address);
            const tx_create_game = await bj_game_factory.create(user_address, ethers.utils.parseEther(bet_amount), {gasLimit: 2000000})
            console.log("create game transaction created for " + user_address)
            await tx_create_game.wait()
            // Get native balance
            console.log("create game Transaction processed for " + user_address)
            const transactionHash = tx_create_game.hash;
            console.log("created Transaction hash :" + transactionHash)
            const chain = EvmChain.MUMBAI;
            console.log("request transaction details for " + transactionHash)
            const create_tx_details = await Moralis.EvmApi.transaction.getTransaction({
                transactionHash,
                chain,
            });
            console.log("fetched details of transaction - " + transactionHash)
            const game_contract = create_tx_details.jsonResponse.logs.find(function (e) {
                return e.topic0 == game_topic;
            })
            console.log(game_contract)
            create_success = true;
            created_game = game_contract.address
        } catch (e) {
            console.log(e);
            create_success = true;
            created_game = "Unexpected error."
            const json_body = JSON.parse(e.body);
            if (json_body.error.message == 'transaction underpriced') {
                create_success = false;
            }
            else{
                console.log(e.body);
            }
        }
    }
    console.log("New Game : " + created_game);
    return created_game;
}
async function declare_winner(player_address, bjct_game, is_player, is_draw) {
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const admin_signer = new ethers.Wallet(owner_pk, provider)
    const bj_game_factory = new ethers.Contract(bgct_game_factory, bj_factory_abi, admin_signer)
    let declare_success = false;
    let tx_msg = "";
    while (!declare_success) {
        try {
            console.log("request declare winner for game - " + bjct_game)
            const declare_tx = await bj_game_factory.declareWinner(bjct_game, is_player, is_draw, {gasLimit: 2000000})
            console.log("declare transaction created - " + bjct_game)
            await declare_tx.wait()
            // Get native balance
            console.log("declare Transaction processed - " + bjct_game)
            const transactionHash = declare_tx.hash;
            console.log("Transaction hash :" + transactionHash)
            
            declare_success = true;
        } catch (e) {
            console.log(e);
            declare_success = true;
            const json_body = JSON.parse(e.body);
            if (json_body.error.message == 'transaction underpriced') {
                declare_success = false;
            }
            tx_msg = e.body;

        }
    }
    let reward_success = false;
    while (!reward_success) {
        try {
            
            if(is_player){
                console.log("User won, request collect reward from " + player_address)
                const bj_game = new ethers.Contract(bjct_game, bj_game_abi, admin_signer)
                const collect_tx = await bj_game.collect( {gasLimit: 2000000})
                console.log("collect transaction created for " + player_address)
                await collect_tx.wait()
                console.log("collect Transaction successed for " + player_address)
            }
            else if(is_draw){
                console.log("User won, request recover reward from " + player_address)
                const bj_game = new ethers.Contract(bjct_game, bj_game_abi, admin_signer)
                const recover_tx = await bj_game.recover( {gasLimit: 2000000})
                console.log("recover transaction created for " + player_address)
                await recover_tx.wait()
                console.log("recover Transaction successed for " + player_address)
            }
            reward_success = true;
        } catch (e) {
            console.log(e);
            reward_success = true;
            const json_body = JSON.parse(e.body);
            if (json_body.error.message == 'transaction underpriced') {
                reward_success = false;
            }
            tx_msg = e.body;
        }
    }
    const chain = EvmChain.MUMBAI;
    const address =  player_address;
    const token_balance = await Moralis.EvmApi.token.getWalletTokenBalances({
        address:address,
        chain:chain,
        tokenAddresses:[bgct_game_token]
    });
    
    console.log(token_balance.jsonResponse[0].balance);
    return token_balance.jsonResponse[0].balance;
}
app.post("/create_game", async (req, res) => {
    console.log("start creating game");
    // Get and return the crypto data
    try {
        const acc_address = req.fields.address;
        const bet_amount = req.fields.amount;
        //const { acc_address, bet_amount} = req.query;
        console.log({
            acc_address,
            bet_amount
        });
        const data = await createGame(acc_address, bet_amount)
        res.status(200)
        res.json(data)

    } catch (e) {
        res.status(200)
        res.json("Unexpected error.")
    }

})


app.post("/declare_winner", async (req, res) => {
    console.log("start declare_winner game");
    // Get and return the crypto data
    try {
        const is_player = Boolean(req.fields.playerwin);
        const is_draw = Boolean( req.fields.isdraw);
        const game_address = req.fields.game_address;
        const user_acc = req.fields.user;
        //const { acc_address, bet_amount} = req.query;
        console.log({
            user_acc,
            game_address,
            is_player,
            is_draw
        });
        const data = await declare_winner(user_acc, game_address, is_player, is_draw)
        res.status(200)
        res.json(data)

    } catch (e) {
        console.log(e);
        res.status(200)
        res.json("Unexpected error.")
    }

})
// Call startServer()
startServer()