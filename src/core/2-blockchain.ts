import { Block } from './block';                    // 引入 Block 类
import { Transaction, TransactionManager } from './transaction'; // 引入 Transaction 接口和 TransactionManager 类
import * as fs from 'fs';                           // 引入文件系统模块
import * as path from 'path';                       // 引入路径模块
import { logWithTimestamp } from './utils';         // 引入日志输出函数
import { BalanceManager } from './balanceManager';
import axios from 'axios';
import config from './config.json';



const mineDifficulty = config.blockchain.difficulty; // 从 config.json 中读取挖矿难度
const mineInterval=config.blockchain.miningInterval;  // 从 config.json 中读取挖矿间隔时间
const minereward = config.reward.minerReward; // 从 config.json 中读取挖矿奖励
const minerRewardAddress = config.reward.rewardAddress; // 从 config.json 中读取挖矿奖励地址



export class Blockchain {

    chainFilePath: string = path.join(__dirname, 'chaindata/blockchain.json'); // 区块链文件存储路径
    

    chain: Block[] = [];                                             // 存储区块链的数组
    pendingTransactions: Transaction[] = [];                         // 存储待处理交易的数组
    difficulty: number = mineDifficulty;                                          // 挖矿难度
    reward: number = minereward;                                            // 挖矿奖励
    transactionManager: TransactionManager;                  // 添加 TransactionManager 实例
    balanceManager: BalanceManager;                                  // 余额管理器

    constructor() {
        this.balanceManager = new BalanceManager();  // 初始化 BalanceManager
        this.transactionManager = new TransactionManager(this, this.balanceManager);          // 初始化 TransactionManager
        this.loadBlockchainFromFile();                // 在构造函数中加载区块链数
        logWithTimestamp('blocakchain----区块链初始化完成，当前区块链长度:', this.chain.length); // 输出当前区块链长度
    }


    // 创建创世区块
    createGenesisBlock(): void {
        const genesisBlock = new Block(0, new Date().toISOString(), [], '0'); // 创建创世区块
        this.chain.push(genesisBlock);                   // 将创世区块添加到链中
        this.saveBlockchainToFile();                     // 保存创世区块
        logWithTimestamp('创世区块已创建');               // 输出创世区块创建信息
    }

    // 添加区块到区块链
    addBlock(newBlock: Block): void {
        newBlock.previousHash = this.getLatestBlock()?.hash || '0'; // 使用最新区块的哈希
        newBlock.mineBlock(this.difficulty);                         // 挖矿新块
        this.chain.push(newBlock);                                   // 将新块添加到链中
                                    
        //更新交易文件，
        for (const transaction of newBlock.transactions) {
            this.balanceManager.updateBalance(transaction);             // 更新余额
            logWithTimestamp(`区块 ${newBlock.index} 已添加，当前区块链长度: ${this.chain.length}`); // 输出添加的区块信息
        }
        //更新链文件
        this.saveBlockchainToFile(); // 保存区块链到文件
    }

     // 获取最新的区块
     getLatestBlock(): Block  {
        if (this.chain.length === 0) {
            logWithTimestamp('getLatestBlock---区块链为空，无法获取最新区块。');
            // return null; // 如果链为空，返回 null
        }

        const latestBlock = this.chain[this.chain.length - 1]; // 获取最后一个区块
        logWithTimestamp(`最新区块信息: ${JSON.stringify(latestBlock, null, 2)}`); // 打印最新区块信息
        return latestBlock; // 返回链上的最后一个区块
    }

    replaceChain(newChain: Block[]): boolean {
        console.log('新莲长度是****************：\n\n', newChain.length);
        console.log('当前链长度是&&&&&&&&&&&：\n\n', this.chain.length);
        if (newChain.length >= this.chain.length) {
            this.chain = newChain;
            logWithTimestamp('区块链已被替换为接收到的链');
            return true;
        } else {
            logWithTimestamp('接收到的链比当前链短，拒绝替换');
            return false;
        }
    }


    // 从文件加载区块链

    loadBlockchainFromFile(): void {
        logWithTimestamp('正在加载本地区块链数据...');
        try {
            if (fs.existsSync(this.chainFilePath)) {  // 检查文件是否存在
                const data = fs.readFileSync(this.chainFilePath, 'utf8');  // 读取文件内容
                const parsedChain = JSON.parse(data);
    
                logWithTimestamp(`\n\n 查看本地区块链数据元文件: ${JSON.stringify(parsedChain, null, 2)}\n`);
    
                // 确保 parsedChain 是一个数组
                if (Array.isArray(parsedChain)) {
                    // 将普通对象转换为 Block 实例，保留文件中的哈希
                    this.chain = parsedChain.map((blockData: any) => new Block(
                        blockData.index,
                        blockData.timestamp,
                        blockData.transactions,
                        blockData.previousHash,
                        blockData.nonce,
                        blockData.hash  // 直接使用文件中的哈希值，而不是重新计算
                    ));
                    logWithTimestamp(`区块链数据已从文件加载完成，当前区块链长度: ${this.chain.length}`); // 输出加载后的区块链长度
                } else {
                    logWithTimestamp('加载的数据不是有效的区块链数组，创建创世区块。');
                    this.createGenesisBlock();  // 如果数据格式不正确，创建创世区块
                }
            } else {
                logWithTimestamp('未找到区块链文件，创建创世区块。');
                this.createGenesisBlock();  // 如果文件不存在，创建创世区块
            }
        } catch (error) {
            logWithTimestamp('加载区块链数据时发生错误:', error);
            this.createGenesisBlock();  // 在加载失败时重新创建区块链
        }
    }
        
    

    // 保存区块链到文件
    saveBlockchainToFile(): void {
        fs.writeFileSync(this.chainFilePath, JSON.stringify(this.chain, null, 2));  // 将区块链数据写入文件
        logWithTimestamp('区块链数据已保存到文件:', this.chainFilePath);             // 输出保存信息
    }



    
    

      // 使用 TransactionManager 来创建交易并添加到待处理交易列表
      createBCTransaction(from: string, to: string, amount: number): Transaction {
        // 使用 TransactionManager 创建交易
        const transaction = this.transactionManager.createTransaction(from, to, amount);

        // 将交易添加到待处理交易列表
        this.pendingTransactions.push(transaction);

        // 使用日志工具记录交易信息
        logWithTimestamp(`交易已添加到待处理交易列表: ${JSON.stringify(transaction, null, 2)}`);

        // 返回创建的交易对象
        return transaction;
    }

    // 获取指定地址的余额
    getBalance(address: string): number {
        let balance = 0;

        for (const block of this.chain) {
            for (const tx of block.transactions) {
                if (tx.from === address) {
                    balance -= tx.amount;
                }
                if (tx.to === address) {
                    balance += tx.amount;
                }
            }
        }

        logWithTimestamp(`地址 ${address} 的当前余额: ${balance}`);
        return balance;
    }



    startMining(minerAddress: string) {
        logWithTimestamp('blockchain.ts ---- 开始挖矿...');

        setInterval(() => {
            let transactionsToInclude = this.pendingTransactions;

            // 如果没有待处理交易，生成空块
            if (this.pendingTransactions.length === 0) {
                logWithTimestamp('没有待处理交易，生成空块...');
                transactionsToInclude = [];  // 空交易列表
            }

            // 获取最新区块
            const latestBlock = this.getLatestBlock();
            if (!latestBlock) {
                logWithTimestamp('无法获取最新区块，挖矿失败。');
                return; // 如果无法获取最新区块，停止挖矿
            }

            // 创建新区块
            const minertransaction= this.transactionManager.createTransaction(minerRewardAddress, minerAddress, this.reward);
            transactionsToInclude.push(minertransaction);
           
           
            const newBlock = new Block(
                this.chain.length,
                new Date().toISOString(),
                transactionsToInclude,
                latestBlock.hash, // 使用最新区块的哈希
              


            );

            logWithTimestamp(`开始挖新区块，当前区块 index: ${newBlock.index}`);

            // 调用挖矿函数来进行哈希计算
            newBlock.mineBlock(this.difficulty);

            // 挖矿成功后添加到区块链
            this.addBlock(newBlock);
            logWithTimestamp('新区块已挖出并添加到区块链:', newBlock);

            // 清空待处理交易
            this.pendingTransactions = [];

        }, mineInterval);  // 每N秒尝试挖矿一次
    }

    // 启动挖矿停止

// 获取待处理交易列表中所有交易的函数
getPendingTransactions(): Transaction[] {
    const pendingTransactions: Transaction[] = []; // 创建一个数组来存储待处理交易

    // 假设有一个属性 this.pendingTransactions 存储待处理交易
    pendingTransactions.push(...this.pendingTransactions); // 将待处理交易添加到数组中

    logWithTimestamp(`当前待处理交易数量: ${pendingTransactions.length}`); // 输出待处理交易数量
    return pendingTransactions; // 返回待处理交易
}

    // 验证区块是否有效（根据难度）
    isValidBlock(block: Block): boolean {
        const hashCheck = block.hash.substring(0, this.difficulty) === '0'.repeat(this.difficulty);
        return hashCheck;
    }
}


const blockchain = new Blockchain();
blockchain.loadBlockchainFromFile();



// logWithTimestamp(`111111111111', ${JSON.stringify(blockchain.getLatestBlock())}`)

