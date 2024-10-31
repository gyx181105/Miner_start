import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const FASTAPI_URL = process.env.FASTAPI_URL;

// 获取用户余额
interface BalanceResponse {
    id: number;
    user_id: number;
    balance: string; // 假设余额是字符串类型
    last_updated: string;
    blockchain_address: string | null;
}

// 转账
interface TransferResponse {
    success: boolean; // 假设返回的转账结果结构
    message?: string; // 可选的消息
}

// 获取用户余额
async function getUserBalance(userId: number): Promise<BalanceResponse[] | undefined> {
    try {
        const response = await axios.get(`${FASTAPI_URL}/api/balance/${userId}`);
        const balanceData: BalanceResponse[] = response.data; // 直接使用响应数据
        console.log('balanceData:', balanceData);
        return balanceData; // 返回用户余额数据数组
    } catch (error) {
        console.error('Error fetching user balance:', error);
        return undefined; // 返回undefined以指示错误
    }
}

// 转账 
async function transferByUserId(senderId: number, receiverId: number, amount: number): Promise<TransferResponse | undefined> {
    try {
        const response = await axios.post(`${FASTAPI_URL}/api/transactionbyuserid`, {
            sender_id: senderId,
            receiver_id: receiverId,
            amount: amount,
        });
        
        const transferData: TransferResponse = response.data; // 直接使用响应数据       
       
        console.log(transferData.message); // 打印消息
       
        return transferData; // 返回转账操作结果
    } catch (error) {
        console.error('TransferByUserId Error:', error);
        return undefined; // 返回undefined以指示错误
    }
}


// 根据用户地址进行转账
async function transferByUserAddress(senderAddress: string, receiverAddress: string, amount: number): Promise<TransferResponse | undefined> {
    try {
        const response = await axios.post(`${FASTAPI_URL}/api/transactionbyaddress`, {
            sender_address: senderAddress,
            receiver_address: receiverAddress,
            amount: amount,
        });
        
        const transferData: TransferResponse = response.data; // 直接使用响应数据       

        console.log(transferData.message); // 打印消息
        
        return transferData; // 返回转账操作结果
    } catch (error) {
        console.error('TransferByUserAddress Error:', error);
        return undefined; // 返回undefined以指示错误
    }
}

export { getUserBalance, transferByUserId, transferByUserAddress };

// 示例调用
// getUserBalance('16').then(data => console.log(data));
// transferByUserId('12345', '67890', 100).then(data => console.log(data));