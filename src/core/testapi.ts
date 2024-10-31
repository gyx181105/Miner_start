import { getUserBalance, transferByUserId } from './testApiRoute';


const userId = 16;
const userBalance = getUserBalance(userId); // 获取用户余额
console.log(userBalance);

// 转账
const transfer = transferByUserId(16, 18, 1.1);

console.log(transfer);
