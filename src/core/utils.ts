import * as fs from 'fs';
import * as path from 'path'; // 引入路径模块

// 创建日志文件夹（如果不存在）
const logDir = path.join(__dirname, 'log');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir); // 创建日志文件夹
}

// 日志文件路径，使用当前日期命名
const logFilePath = path.join(logDir, `logs_${new Date().toISOString().split('T')[0]}.log`);

// 带时间戳的日志记录函数，接受任意数量的参数
export function logWithTimestamp(...messages: any[]): void {
    const timestamp = new Date().toISOString(); // 获取当前时间戳
    const logMessage = `[${timestamp}] ${messages.join(' ')}\n`; // 格式化日志信息
    console.log(logMessage); // 输出到控制台

    // 将日志信息追加到日志文件
    fs.appendFileSync(logFilePath, logMessage, 'utf8'); // 追加写入日志文件
}

// 保存数据到文件
export function saveToFile(filePath: string, data: any): void {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2)); // 将数据写入文件
}

// 从文件加载数据
export function loadFromFile(filePath: string): any {
    if (fs.existsSync(filePath)) { // 检查文件是否存在
        const data = fs.readFileSync(filePath, 'utf8'); // 读取文件内容
        return JSON.parse(data); // 解析并返回数据
    }
    return null; // 如果文件不存在，返回 null
}