const ethers = require("ethers");

/*
Issue: https://github.com/NethermindEth/nethermind/issues/5706

The gist (https://gist.github.com/nflaig/ea5b1b3f0413cd36e4391cad110ec177) does not use the same 'data'
as the real transaction (https://etherscan.io/tx/0x4ce8bf18b702ad810bded432b4f59b20ee038b6828fb45e633cc199c944c2fce). 

Parity VM Trace Transaction: https://etherscan.io/vmtrace?txhash=0x4ce8bf18b702ad810bded432b4f59b20ee038b6828fb45e633cc199c944c2fce&type=parity

Following tests uses the real transaction:

- Erigon 2.48.0-stable-084acc1a:            Gas required exceeds allowance (5000)
    - With Gas="0xFFFFFF"                   25880
- geth 1.12.0-stable-e501b3b0:              Gas required exceeds allowance (5000)
    - With Gas="0xFFFFFF"                   25880
- Nethermind 1.21.0-unstable+691bf121:      25880
    - With Gas="0xFFFFFF"                   25880
- RPCs:
    - blxrbdn-Geth/v1.11.5-stable-01c4d602: Execution reverted
    - Llama-llamanodes_web3_proxy/v0.36.0:  Execution reverted
    - Ankr-Geth/v1.12.0-stable-e501b3b0:    Execution reverted
    - Alchemy-Geth/v1.11.5-stable-a38f4108: Execution reverted
- Tenderly:
    - Running with GasLimit=8_000_000 (default simulator) succeds (gas used: 207621) (https://dashboard.tenderly.co/emlautarom1/project/simulator/e630902e-f785-40fc-87e0-008853474c02)
*/
let testMainnet = {
    "from": "0x9D055dd23de15114EC95921208c741873eDE8558",
    "to": "0xe74Bc1C4C27284ab7DbcF55f71FCc04b832FC32C",
    "gas": "0xFFFFFF",
    "data": "0x73053410000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000342f697066732f516d61624763754354786a57637a6b766f323977616d69355057435372514435656e744c62717a7a55486b79566f000000000000000000000000",
};

/*
Issue: https://github.com/NethermindEth/nethermind/issues/5637

- Erigon 2.48.0-stable-084acc1a:            29400
- Nethermind 1.21.0-unstable+691bf121:      29400
- RPCs:
    - Official-Nethermind/v1.19.1+6fa13930: 59074
    - Gateway-Nethermind/v1.19.3+e8ac1da4:  59074
    - BlockPi-Nethermind/v1.19.3+e8ac1da4:  59074
    - Blast-Nethermind/v1.19.3+e8ac1da4:    59074
    - Pokt-Nethermind/v1.14.7+4fe81c6b:     59074
    - Ankr-Nethermind/v1.19.3+e8ac1da4:     59074
- Tenderly:                                 Success (gas used: 56285)
    - Running with Gas=59074 fails: require(gasleft() >= safeTxGas, "Not enough gas to execute safe transaction"); (https://dashboard.tenderly.co/shared/simulation/78cd9424-4e0f-44ed-97b5-26ebc330284c)
    - safeTxGas is part of `data`: 0x14bb8 = 84920
    - Running with Gas=59074+84920=143994 succeds (gas used: 56285) (https://dashboard.tenderly.co/shared/simulation/df8e2e37-9336-447b-9d13-bd5359bd3129)
*/
let testGnosisSafe = {
    "type": "0x0",
    "from": "0xbbeedb6d8e56e23f5812e59d1b6602f15957271f",
    "to": "0x828cf988de33bf93527533852e95e2da449ec171",
    "data": "0x6a761202000000000000000000000000828cf988de33bf93527533852e95e2da449ec171000000000000000000000000000000000000000000000000000000e8d4a51000000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000014bb80000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000041e0a9f565f27a4fd5743e5b7ad92f4217467bc5a7a419c7e159a5950de845ad9b0e88bf1c5549d5335ca087c010a7560a5caf991ba88850d10cb1e2d6196b4a151b00000000000000000000000000000000000000000000000000000000000000"
};

/*
Local clients:

* Erigon (2.48.0-stable-084acc1a):
    - Mainnet: `--chain=mainnet`
    - Gnosis: `--chain=gnosis`

* Nethermind (1.21.0-unstable+691bf121):
    - Mainnet: `--config mainnet`
    - Gnosis: `--config gnosis`

* Geth (1.12.0-stable-e501b3b0):
    - Mainnet: `--mainnet --http --http.api 'web3,eth,net,debug,personal' --http.corsdomain '*'`
*/

(async () => {
    [
        // { client: "Localhost", url: "http://127.0.0.1:8545/" },
        // Mainnet
        { client: "Llama", url: "https://eth.llamarpc.com" },
        { client: "blxrbdn", url: "https://virginia.rpc.blxrbdn.com" },
        { client: "Ankr", url: "https://rpc.ankr.com/eth" },
        { client: "Alchemy", url: "https://eth-mainnet.g.alchemy.com/v2/demo" },
        // Gnosis
        // { client: "Official", url: "https://rpc.gnosischain.com/" },
        // { client: "Gateway", url: "https://rpc.gnosis.gateway.fm" },
        // { client: "BlockPi", url: "https://gnosis.blockpi.network/v1/rpc/public" },
        // { client: "Blast", url: "https://gnosis-mainnet.public.blastapi.io" },
        // { client: "Pokt", url: "https://gnosischain-rpc.gateway.pokt.network" },
        // { client: "Ankr", url: "https://rpc.ankr.com/gnosis" }
    ].forEach(async ({ client, url }) => {
        let version = await clientVersion(url);
        let estimation = await estimateGas(url, testMainnet);

        console.log(`Client '${client}-${version}' estimated '${estimation}'`);
    });
})();

async function clientVersion(url) {
    let { result } = await ethers.utils.fetchJson(url, `{ "id": 42, "jsonrpc": "2.0", "method": "web3_clientVersion", "params": [] }`);
    return result;
}

async function estimateGas(url, body) {
    let response = await ethers.utils.fetchJson(url, `{ "id": 42, "jsonrpc": "2.0", "method": "eth_estimateGas", "params": [${JSON.stringify(body)}] }`);
    console.log(response);

    let estimation = parseInt(response.result, 16);

    return estimation;
}

