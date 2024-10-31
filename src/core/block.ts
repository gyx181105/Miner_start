import * as crypto from 'crypto';

export class Block {

    public hash: string;  // 区块的哈希

    constructor(
        public index: number,
        public timestamp: string,
        public transactions: any[],
        public previousHash: string = '',
        public nonce: number = 0,
        hash?: string  // 可选的哈希参数，用于载入现有区块时使用
    ) {
        if (hash) {
            this.hash = hash;  // 如果传入了哈希值，则使用它
        } else {
            this.hash = this.calculateHash();  // 否则重新计算哈希
        }
    }

    // 计算区块哈希 16位
    calculateHash(): string {
        return crypto.createHash('md5')
            .update(this.index + this.previousHash + this.timestamp + JSON.stringify(this.transactions) + this.nonce)
            .digest('hex')
            .slice(0, 16);  // 截取前16位
    }

    // 挖矿函数，根据难度进行哈希运算
    mineBlock(difficulty: number): void {
        const target = '0'.repeat(difficulty);  // 根据难度生成目标前缀
        let attempt = 0;
        let lastLogTime = Date.now();  // 上次日志输出时间

        // 循环计算哈希，直到满足难度条件
        while (this.hash.substring(0, difficulty) !== target) {
            this.nonce++;  // 不断尝试改变 nonce
            this.hash = this.calculateHash();  // 重新计算哈希

            attempt++;

            // 控制日志输出间隔，每隔 5 秒输出一次日志
            const currentTime = Date.now();
            if (currentTime - lastLogTime > 5000) {
                console.log(`正在尝试挖矿... 尝试次数: ${attempt}, 当前 nonce: ${this.nonce}, 当前 hash: ${this.hash}`);
                lastLogTime = currentTime;  // 更新上次日志输出时间
            }
        }

        // 当找到符合条件的哈希后输出结果
        console.log(`🎉 区块已成功挖出! nonce: ${this.nonce}, hash: ${this.hash}, 挖矿尝试次数: ${attempt}`);
    }
}