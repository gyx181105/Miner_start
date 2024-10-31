import axios, { AxiosError } from 'axios';
import { Blockchain } from './2-blockchain';
import { Block } from './block';
import { TransactionManager } from './transaction';
import { logWithTimestamp } from './utils';
import { BalanceManager } from './balanceManager';
import { initP2PServer, connectToPeer, broadcast } from './6-p2p';
import { MessageType } from './6-p2p';
import fs from 'fs';
import path from 'path';
import { Worker } from 'worker_threads';
import os from 'os';
import config from './config.json';

const serverIP = config.network.serverIP;
const serverPort = config.network.rpcPort;
const serverurl = `http://${serverIP}:${serverPort}`;
const peerconnecturl = `ws://${serverIP}:${config.network.p2pServerPort}`;
const p2pminerport = config.miner.p2pMinerPort;
const mineDifficulty = config.blockchain.difficulty;
const mineInterval = config.blockchain.miningInterval;
const minerwalletAddress = config.wallet.minerAddress;
const hashServerurl = `http://${config.network.hashServerIP}:${config.network.hashServerPort}`;
const cpuUtilization = config.mining.cpuUtilization;

logWithTimestamp(`🌟 启动矿工程序 🌟`);
logWithTimestamp(`💻 矿工地址: ${minerwalletAddress}`);
logWithTimestamp(`🔧 挖矿难度: ${mineDifficulty}`);
logWithTimestamp(`⏳ 挖矿间隔: ${mineInterval} 毫秒`);
logWithTimestamp(`🌐 服务器地址: ${serverurl}`);
logWithTimestamp(`🔗 P2P 服务器地址: ${peerconnecturl}`);

export class Miner {
    minerAddress: string;
    blockchain: Blockchain;
    transactionManager: TransactionManager;
    isMining: boolean = false;
    miningInterval: number = mineInterval;
    newBlock: Block | null = null;
    lastSubmittedBlockHash: string | null = null;
    difficulty: number;

    constructor(minerAddress: string, difficulty: number, blockchain: Blockchain, balanceManager: BalanceManager) {
        this.minerAddress = minerAddress;
        this.difficulty = difficulty;
        this.blockchain = blockchain;
        this.transactionManager = new TransactionManager(blockchain, balanceManager);
    }

    async getLatestBlock() {
        console.log('🔍 Fetching the latest block from the server...');
        try {
            const response = await axios.get(`${serverurl}/latest-block`);
            logWithTimestamp('📦 Latest block received from server:', response.data);
            return response.data;
        } catch (error) {
            logWithTimestamp('❌ 无法从服务器获取最新区块:', error);
            throw error;
        }
    }

    async submitBlock(newBlock: Block) {
        logWithTimestamp('📤 正在向主节点提交新区块:', newBlock);
        try {
            if (!this.isValidBlock(newBlock)) {
                logWithTimestamp('❌ 提交区块时发现结构无效:', newBlock);
                return;
            }
            if (newBlock.hash === this.lastSubmittedBlockHash) {
                logWithTimestamp(`⚠️ 该区块 ${newBlock.hash} 已提交，跳过重复提交。`);
                return;
            }

            const response = await axios.post(`${serverurl}/submit-block`, { block: newBlock });
            if (response.status === 200) {
                logWithTimestamp('✅ 区块已提交:', newBlock.hash);
                this.lastSubmittedBlockHash = newBlock.hash;
                broadcast({ type: MessageType.NEW_BLOCK, data: newBlock });
            } else {
                logWithTimestamp(`❌ 提交区块失败，状态码: ${response.status}`);
                await this.retrySubmit(newBlock);
            }
        } catch (error) {
            this.handleSubmitError(error, newBlock);
        }
    }

    isValidBlock(block: Block): boolean {
        return (
            typeof block.index !== 'undefined' &&
            !!block.timestamp &&
            Array.isArray(block.transactions) &&
            !!block.previousHash &&
            block.nonce >= 0 &&
            !!block.hash
        );
    }

    async retrySubmit(newBlock: Block) {
        console.log('⏸️  暂停 3 秒后重新提交区块...');
        await this.pause(3000);
        await this.submitBlock(newBlock);
    }

    handleSubmitError(error: unknown, newBlock: Block) {
        const axiosError = error as AxiosError;
        if (axiosError.response) {
            logWithTimestamp(`❌ 提交区块时出错，服务器返回的状态码:${axiosError.response.status}`);
        } else {
            logWithTimestamp('❌ 提交区块时发生未知错误:', (error as Error).message);
        }
        this.retrySubmit(newBlock);
    }

    async startMining() {
        this.isMining = true;
        logWithTimestamp(`🚀 Miner ${this.minerAddress} started mining with difficulty ${this.difficulty}...`);

        const cpuCount = os.cpus().length;
        logWithTimestamp(`🖥️  检测到 ${cpuCount} 个 CPU 核心，准备启动 ${cpuCount} 个挖矿线程...`);

        while (this.isMining) {
            try {
                await this.syncBlockchain();
                let transactions = this.blockchain.getPendingTransactions();
                logWithTimestamp(`🧾 交易池里待处理交易: ${transactions}`);

                const latestBlock = await this.getLatestBlock();
                logWithTimestamp(`📏 当前链的最新区块高度为: ${latestBlock.index}`);
                this.newBlock = new Block(
                    latestBlock.index + 1,
                    new Date().toISOString(),
                    transactions,
                    latestBlock.hash
                );
                logWithTimestamp('⛏️ 开始挖新区块...');

                const minedBlocks = await this.mineWithWorkers(Math.ceil(cpuCount * cpuUtilization), this.difficulty);
                for (const minedBlock of minedBlocks) {
                    logWithTimestamp(`💎 Block mined! Hash: ${minedBlock.hash}`);
                    await this.submitBlock(minedBlock);
                }

                this.blockchain.pendingTransactions = [];
                await this.pause(this.miningInterval);
            } catch (error) {
                console.error('❌ 挖矿时发生错误:', error);
                this.stopMining();
            }
        }
    }

    private async mineWithWorkers(workerCount: number, difficulty: number): Promise<any[]> {
        const promises = [];
        let totalHashRate = 0;

        for (let i = 0; i < workerCount; i++) {
            promises.push(this.mineWithWorker(difficulty));
        }

        const results = await Promise.all(promises);
        results.forEach((result) => {
            const { stats } = result;
            logWithTimestamp(`线程算力: ${stats.hashRate.toFixed(2)} H/s, 尝试次数: ${stats.attempt}, 用时: ${stats.elapsedTime.toFixed(2)} 秒`);
            totalHashRate += stats.hashRate;
        });

        logWithTimestamp(`🌐 矿机总算力: ${totalHashRate.toFixed(2)} H/s`);
        await this.submitHashRate(totalHashRate);

        return results.map(result => result.block);
    }

    private mineWithWorker(difficulty: number): Promise<any> {
        return new Promise((resolve, reject) => {
            const worker = new Worker('./minerWorker.ts', {
                workerData: { newBlock: this.newBlock, difficulty }
            });

            worker.on('message', (result: any) => {
                const { block, stats } = result;
                resolve({ block, stats });
            });

            worker.on('error', (error) => {
                reject(error);
            });

            worker.on('exit', (code) => {
                if (code !== 0) {
                    reject(new Error(`Worker stopped with exit code ${code}`));
                }
            });
        });
    }

    private async submitHashRate(hashRate: number) {
        try {
            const response = await axios.post(`${hashServerurl}/submit-hashrate`, {
                minerAddress: this.minerAddress,
                hashRate: hashRate
            });

            if (response.status === 200) {
                logWithTimestamp(`✅ 成功将算力提交到服务器: ${hashRate.toFixed(2)} H/s`);
            } else {
                logWithTimestamp(`❌ 提交算力失败，服务器返回状态码: ${response.status}`);
            }
        } catch (error) {
            logWithTimestamp(`❌ 提交算力时发生错误: ${error}`);
        }
    }

    async syncBlockchain() {
        logWithTimestamp('🔄 正在同步区块链...');
        try {
            const response = await axios.get(`${serverurl}/blockchain`);
            const blockchainData = response.data;
            logWithTimestamp(`🔍 区块链同步中: ${response}`);

            const dir = path.join(__dirname, './chaindata/');
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            fs.writeFileSync(path.join(dir, 'blockchain.json'), JSON.stringify(blockchainData, null, 2));
            logWithTimestamp('📦 区块链同步完成，已保存到 chaindata/blockchain.json');
        } catch (error) {
            logWithTimestamp(`❌ 同步区块链时发生错误: ${error}`);
        }
    }

    stopMining(): void {
        this.isMining = false;
        logWithTimestamp(`矿工 ${this.minerAddress} 停止挖矿。`);
    }

    pause(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

const blockchain = new Blockchain();
const balanceManager = new BalanceManager();

initP2PServer(p2pminerport, blockchain);

const miner = new Miner(minerwalletAddress, mineDifficulty, blockchain, balanceManager);
miner.startMining();

connectToPeer(peerconnecturl, blockchain);
