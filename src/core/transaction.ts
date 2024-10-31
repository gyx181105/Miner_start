import { keccak256, toUtf8Bytes } from 'ethers'; // 引入 v6 的 keccak256 和 toUtf8Bytes
import { logWithTimestamp } from './utils';      // 引入日志输出函数
import { Blockchain } from './2-blockchain';       // 引入区块链来检查账号信息
import { BalanceManager } from './balanceManager';  // 引入 BalanceManager 检查余额

// 定义交易接口
export interface Transaction {
    from: string; // 发送方地址
    to: string; // 接收方地址
    amount: number; // 交易金额
    status: 'confirmed' | 'pending'; // 交易状态
    hash: string; // 交易哈希
    timestamp: string; // 交易时间戳
}

// 交易管理类
export class TransactionManager {
    private blockchain: Blockchain;  // 引入区块链实例
    private balanceManager: BalanceManager;  // 引入账户余额管理器实例
   

    constructor(blockchain: Blockchain, balanceManager: BalanceManager) {
        this.blockchain = blockchain;
        this.balanceManager = balanceManager;
    }

    // 创建交易前，验证账号信息和余额是否合理
    validateTransaction(from: string, to: string, amount: number): boolean {
        const fromBalance = this.balanceManager.getBalance(from);

        // 验证发送方是否为 coinbase 或余额是否足够
        if (from !== 'coinbase') {
            if (fromBalance < amount) {
                logWithTimestamp(`EEROR:--交易失败，发送方余额不足: ${from} 余额: ${fromBalance}, 交易金额: ${amount}`);
                return false;
            }

            if (fromBalance === -1) {
                logWithTimestamp(`EEROR:--交易失败，发送方账户 ${from} 不存在`);
                return false;
            }
        }

        // 检查接收方地址是否存在（有效地址）
        if (!to || this.balanceManager.getBalance(to) === -1) {
            logWithTimestamp(`EEROR:--交易失败，接收方地址无效或不存在: ${to}`);
            return false;
        }

        return true;
    }

    // 创建交易
    createTransaction(from: string, to: string, amount: number): Transaction {
        // 验证交易是否合理
        if (!this.validateTransaction(from, to, amount)) {
            logWithTimestamp('交易验证失败，交易未创建');
            // throw new Error('交易验证失败：账户余额不足或地址无效');
        }

        const transaction: Transaction = {
            from,
            to,
            amount,
            status: 'pending', // 初始状态为待处理
            hash: this.calculateTransactionHash(from, to, amount), // 计算交易哈希
            timestamp: new Date().toISOString()  // 记录交易创建时间
        };

      
        logWithTimestamp(`交易已创建: ${JSON.stringify(transaction)}`); // 输出创建的交易信息
        return transaction; // 返回创建的交易
    }
    // 创建交易结束

 


    // 计算交易哈希
    calculateTransactionHash(from: string, to: string, amount: number): string {
        const hash = keccak256(toUtf8Bytes(from + to + amount.toString())); // 生成哈希
        logWithTimestamp(`计算的交易哈希: ${hash}`); // 输出计算的哈希
        return hash; // 返回计算的哈希
    }

}