
const historicalBlocks = 4;

const formatFeeHistory = (result, includePending) => {
    let blockNum = Number(result.oldestBlock);
    let index = 0;
    const blocks = [];
    while (blockNum < Number(result.oldestBlock) + historicalBlocks) {
        blocks.push({
            number: blockNum,
            baseFeePerGas: Number(result.baseFeePerGas[index]),
            gasUsedRatio: Number(result.gasUsedRatio[index]),
            priorityFeePerGas: result.reward[index].map(x => Number(x)),
        });
        blockNum += 1;
        index += 1;
    }
    if (includePending) {
        blocks.push({
            number: "pending",
            baseFeePerGas: Number(result.baseFeePerGas[historicalBlocks]),
            gasUsedRatio: NaN,
            priorityFeePerGas: [],
        });
    }
    return blocks;
}

export const estimatePriorityFee = async (web3) => {
    try {
        const feeHistories = await web3.eth.getFeeHistory(historicalBlocks, "pending", [10]);
        console.log(feeHistories)
        const blocks = formatFeeHistory(feeHistories, false);
        console.log(blocks)
        const firstPercentilePriorityFees = blocks.map(b => b.priorityFeePerGas[0]);
        console.log(firstPercentilePriorityFees)
        const sum = firstPercentilePriorityFees.reduce((a, v) => a + v);
        console.log(sum)
        const value = Math.ceil(sum / firstPercentilePriorityFees.length);
        console.log(value)
        return value;
    } catch (e) {
        console.log(e);
        throw (e)
    }
}