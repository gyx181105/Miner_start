const { parentPort, workerData } = require('worker_threads');  // 使用 require 导入

const { difficulty } = workerData;  // 只保留 difficulty
const newBlock = workerData.newBlock;  // 从 workerData 中获取 newBlock

const crypto = require('crypto');




// 挖矿逻辑
function mineBlock(difficulty) {
    const block = { ...newBlock };  // 创建新块的副本
    const target = '0'.repeat(difficulty);  // 根据难度生成目标前缀
    let attempt = 0;

    const startTime = Date.now();

    // 循环计算哈希，直到满足难度条件
    while (block.hash.substring(0, difficulty) !== target) {
        block.nonce++;  // 不断尝试改变 nonce
        block.hash = calculateHash(block);  // 重新计算哈希
        attempt++;
    }

    const endTime = Date.now();
    const elapsedTime = (endTime - startTime) / 1000;  // 用秒表示
    const hashRate = attempt / elapsedTime;  // 每秒的哈希尝试次数

    console.log(`🎉 区块已成功挖出! nonce: ${block.nonce}, hash: ${block.hash}, 挖矿尝试次数: ${attempt}`);
    console.log(`单线程算力: ${hashRate.toFixed(2)} H/s, 用时: ${elapsedTime.toFixed(2)} 秒`);
    
    return { 
        block,  // 挖出的区块
        stats: { hashRate, attempt, elapsedTime }  // 分离的统计信息
    };
}

// 计算哈希的辅助函数
function calculateHash(block) {
    // 这里实现您的哈希计算逻辑，例如使用 SHA256
    return require('crypto').createHash('sha256').update(JSON.stringify(block)).digest('hex');
}

// 开始挖矿
const result = mineBlock(difficulty);
parentPort?.postMessage(result);  // 将挖到的区块和统计信息发送回主线程、