import * as fs from 'fs';
import * as path from 'path';
import { logWithTimestamp } from './utils';
import { Transaction } from './transaction';

export class BalanceManager {
    balances: { [address: string]: { balance: number } } = {};  // 账户余额的对象结构
    accountsFilePath: string = path.join(__dirname, 'balance/accounts.json');  // 账户余额文件路径

    constructor() {
        this.loadBalancesFromFile();  // 在构造函数中加载账户余额
    }

    // 从文件加载余额
    loadBalancesFromFile(): void {
        try {
            if (fs.existsSync(this.accountsFilePath)) {
                const data = fs.readFileSync(this.accountsFilePath, 'utf8');
                const accountsData = JSON.parse(data);

                // 获取 accounts 对象中的数据
                this.balances = accountsData.accounts || {};  // 确保从 "accounts" 中读取余额
                logWithTimestamp('账户余额已从文件加载完成');
            } else {
                logWithTimestamp('未找到账户余额文件，将创建新的文件');
                this.saveBalancesToFile();  // 如果文件不存在，保存初始状态的余额数据
            }
        } catch (error) {
            logWithTimestamp('加载账户余额时发生错误:', error);
        }
    }

    // 保存余额到文件
    saveBalancesToFile(): void {
        try {
            const accountsData = { accounts: this.balances };
            fs.writeFileSync(this.accountsFilePath, JSON.stringify(accountsData, null, 2));
            logWithTimestamp('账户余额已保存到文件:', this.accountsFilePath);
        } catch (error) {
            logWithTimestamp('保存账户余额时发生错误:', error);
        }
    }

    // 验证账户是否存在
    verifyAccountExists(address: string): boolean {
        if (!this.balances[address]) {
            logWithTimestamp(`BalanceManager:账户 ${address} 不存在`);
            return false;
        }
        return true;
    }

    // 验证账户是否有足够的余额进行交易
    verifySufficientFunds(address: string, amount: number): boolean {
        if (!this.verifyAccountExists(address)) {
            logWithTimestamp(`账户 ${address} 不存在，无法验证余额`);
            return false;
        }

        if (this.balances[address].balance < amount) {
            logWithTimestamp(`账户 ${address} 余额不足，当前余额: ${this.balances[address].balance}, 需要: ${amount}`);
            return false;
        }

        return true;
    }

    // 更新余额
    updateBalance(transaction: Transaction): boolean {
        // 验证发送者账户（非 coinbase 交易）
        if (transaction.from !== 'coinbase') {
            if (!this.verifySufficientFunds(transaction.from, transaction.amount)) {
                logWithTimestamp(`交易失败：发送方 ${transaction.from} 余额不足`);
                return false; // 余额不足时，交易失败
            }
        }

        // 验证接收者账户
        if (!this.verifyAccountExists(transaction.to)) {
            logWithTimestamp(`交易失败：接收方 ${transaction.to} 不存在`);
            return false; // 接收方账户不存在时，交易失败
        }

        // 更新接收者的余额
        if (!this.balances[transaction.to]) {
            this.balances[transaction.to] = { balance: 0 };
        }
        this.balances[transaction.to].balance += transaction.amount;

        // 更新发送者的余额（非 coinbase 交易）
        if (transaction.from !== 'coinbase') {
            if (!this.balances[transaction.from]) {
                this.balances[transaction.from] = { balance: 0 };
            }
            this.balances[transaction.from].balance -= transaction.amount;
        }

        // 记录日志并保存最新的余额数据到文件
        logWithTimestamp(`更新了账户余额，发送者: ${transaction.from}, 接收者: ${transaction.to}, 金额: ${transaction.amount}`);
        this.saveBalancesToFile();  // 每次更新余额后保存
        return true;  // 交易成功
    }

    // 获取某个地址的余额
    // 获取某个地址的余额，并验证账户是否存在
 // 获取某个地址的余额，并验证账户是否存在
// 获取某个地址的余额，并验证账户是否存在

// 获取某个地址的余额，并验证账户是否存在
getBalance(address: string): number {
    if (!this.verifyAccountExists(address)) {
        logWithTimestamp(`无法获取余额：账户 ${address} 不存在`);
        // throw new Error(`账户 ${address} 不存在`); // 抛出异常
        return -1; // 如果账户不存在，返回 -1
    }
    return this.balances[address].balance;
}

}