import { useEffect, useState } from 'react';
import {
    Token,
    TokenAmount,
    TradeType,
    Route,
    Trade,
    Fetcher,
    // WETH,
    Percent,
} from "@sushiswap-core/sdk";
import ContractConfigs from '../abis/contracts.json';
import Web3 from 'web3';
import { toWei, fromWei, toBN } from 'web3-utils';
import { estimatePriorityFee } from '../services/contractService';

const CONTRACTS = ContractConfigs.contracts;
const swapRouterName = "SushiSwapRouter";

const CHAIN_ID = 1;
const tokens = {
    weth: {
        symbol: "WETH",
        name: "Wrapped ETH",
        decimals: 18,
        4: "0xc778417E063141139Fce010982780140Aa0cD5Ab",
        1: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    },
    usdc: {
        symbol: "USDC",
        name: "USDC",
        decimals: 6,
        4: "0x4DBCdF9B62e891a7cec5A2568C3F4FAF9E8Abe2b",
        1: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
    },
    uni: {
        symbol: "UNI",
        name: "UNI",
        decimals: 18,
        4: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
        1: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984"
    },
    sushi: {
        symbol: "SUSHI",
        name: "Sushi",
        decimals: 18,
        4: "0x5457Cc9B34eA486eB8d3286329F3536f71fa8A8B",
        1: "0x6B3595068778DD592e39A122f4f5a5cF09C90fE2"
    }
}

const UniToken = new Token(CHAIN_ID, tokens["uni"][CHAIN_ID], tokens["uni"].decimals, tokens["uni"].symbol, tokens["uni"].name);
const SushiToken = new Token(CHAIN_ID, tokens["sushi"][CHAIN_ID], tokens["sushi"].decimals, tokens["sushi"].symbol, tokens["sushi"].name);
const WethToken = new Token(CHAIN_ID, tokens["weth"][CHAIN_ID], tokens["weth"].decimals, tokens["weth"].symbol, tokens["weth"].name);
const UsdcToken = new Token(CHAIN_ID, tokens["usdc"][CHAIN_ID], tokens["usdc"].decimals, tokens["usdc"].symbol, tokens["usdc"].name);

const slippageTolerance = new Percent('50', '10000');

const inputToken = SushiToken;
const outputToken = UniToken;

console.log(inputToken)
console.log(outputToken)

const Home = () => {
    const [tradeData, setTradeData] = useState();
    const [inputAmount, setInputAmount] = useState(1);
    const [outputAmount, setOutputAmount] = useState(0.0);
    const [invertedAmount, setInvertedAmount] = useState(0.0);
    const [error, setError] = useState(false);

    const web3 = new Web3(window.ethereum);

    useEffect(() => {
        if (Number(inputAmount) > 0) {
            updates();
        }
    }, [inputAmount])

    const getPair = async () => {
        const pair = await Fetcher.fetchPairData(inputToken, outputToken);
        return pair;
    }

    const getRoute = async (pair, inputCurrency) => {
        const route = new Route([pair], inputCurrency);
        return route;
    }

    const updates = async () => {
        try {
            const fromToken = inputToken;

            const pair = await getPair();
            console.log(pair);
            const route = await getRoute(pair, fromToken);
            console.log(route);

            const trade = new Trade(
                route,
                new TokenAmount(fromToken, toWei(inputAmount.toString())),
                TradeType.EXACT_INPUT
            );
            console.log(trade);
            setTradeData(trade);
            const priceImpact = trade.priceImpact.toFixed(2);
            console.log(priceImpact);
            const outputAmount = trade.outputAmount.toSignificant(6);
            console.log(outputAmount);
            setOutputAmount(outputAmount);

            const invertedAmt = trade.route.midPrice.invert().toSignificant(6);
            console.log(invertedAmt);
            setInvertedAmount(invertedAmt);
        } catch (err) {
            console.log(err);
            setError(true);
        }
    }

    const handleSwap = async () => {
        try {
            const provider = window.ethereum;
            const accountAddress = provider.selectedAddress;
    
            const trade = tradeData;
            const amountOutMin = trade.minimumAmountOut(slippageTolerance).raw.toString();
            const path = [inputToken.address, outputToken.address];
            const to = accountAddress; // should be a checksummed recipient address
            const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes from the current Unix time
            const value = trade.inputAmount.raw.toString();
    
            console.log(amountOutMin);
            console.log(path);
            console.log(to);
            console.log(deadline);
            console.log(value);
    
            console.log(web3);

            
            const contract = new web3.eth.Contract(CONTRACTS[swapRouterName].abi, CONTRACTS[swapRouterName].address);
            console.log(contract);

            const tokenContract = new web3.eth.Contract(CONTRACTS[inputToken.name].abi, CONTRACTS[inputToken.name].address);
            console.log(tokenContract)
            console.log(
                accountAddress,
                tokenContract._address,
                contract.options.address, amountOutMin
            )
            let inputAmountInWei = toWei(inputAmount.toString());
            const approve = await web3.eth.sendTransaction({
                from: accountAddress,
                to: tokenContract._address,
                data : tokenContract.methods.approve(contract.options.address, inputAmountInWei).encodeABI()
            });
    
            if (!approve) {
                console.log("Approval Canceled!");
                return;
            }
    
            let gasPrice = await web3.eth.getGasPrice();
            console.log("gasPrice", gasPrice)
    
            let gasPriceBN = toBN(gasPrice);
            console.log("gasPriceBN", gasPriceBN)
    
            let finalGasPrice = gasPriceBN.add(toBN(parseInt(0.1 * gasPriceBN))).toString();
            console.log("finalGasPrice", finalGasPrice)
    
            let estimatedPriorityFee = await (await estimatePriorityFee(web3)).toString();
            console.log("estimatedPriorityFee", estimatedPriorityFee)
            
            let finalMaxFeePerGas = toBN(finalGasPrice).add(toBN(parseInt(estimatedPriorityFee))).toString();
            console.log("finalMaxFeePerGas", finalMaxFeePerGas)
    
            console.log(amountOutMin,
                path,
                to,
                deadline)
            console.log(value)

            // To Swap using native currency: ETH in this case
            // let gasEstimate = await contract.methods.swapExactETHForTokens().estimateGas();
            let gasEstimate = await contract.methods.swapExactTokensForTokens(
                value,
                amountOutMin,
                path,
                to,
                deadline
            ).estimateGas({ from: accountAddress, value: value });
            console.log("gasEstimate", gasEstimate)
    
            console.log(contract);
            await contract.methods
                .swapExactTokensForTokens(
                    value,
                    amountOutMin,
                    path,
                    to,
                    deadline
                ).send({
                    from: to,
                    value: value,
                    gasLimit: gasEstimate,
                    gasPrice: finalGasPrice,
                    maxFeePerGas: finalMaxFeePerGas,
                    maxPriorityFeePerGas: estimatedPriorityFee
                })
                .on('transactionHash', function (hash) {
                    console.log("transactionHash: ", hash);
                })
                .on('receipt', function (receipt) {
                    console.log("Success", receipt);
                });
        } catch (err) {
            console.log(err);
        }
    }

    const handleInputChange = (e) => {
        let value = e.target.value;
        console.log(value);
        setInputAmount(value);
    }

    return (
        <div>
            <input type="number" value={inputAmount} onChange={handleInputChange} />
            <h2>{inputAmount} {inputToken.name} for {outputAmount} {outputToken.name}</h2>
            <h4>[1 {outputToken.name} = {invertedAmount} {inputToken.name}]</h4>
            {error && <h3 style={{ color: "red" }}>Error Occured!</h3>}

            <button onClick={handleSwap}>Swap</button>
        </div>
    )
}

export default Home;