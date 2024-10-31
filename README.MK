#项目结构如下：
- src/
  - blockchain.ts  // 包含区块和区块链逻辑
  - server.ts      // 区块链节点的主服务文件
  - miner.ts       // 矿工逻辑（独立的矿工程序）


# 运行项目

## 运行env

```
conda activate nodechain
```

## 安装依赖

```
npm install express axios
```

##  1 、启动区块链节点

```
clear &&  lsof -t -i:3001 | xargs kill -9    && npx ts-node server.ts

```

## 访问区块链节点

```


## 2 启动矿工程序
```
npm install axios
```

```
npx ts-node miner.ts
```

# 检查区块链状态

```bash
curl http://localhost:3001/latest-block
```



# 区块链操作
## 发送交易
curl -X POST http://localhost:3001/transaction \
  -H "Content-Type: application/json" \
  -d '{
    "from": "0x1234567890abcdef1234567890abcdef12345678",
    "to": "0xabcdefabcdefabcdefabcdefabcdefabcdef",
    "amount": "10",
    "privateKey": "yourPrivateKey"
  }'

  # 查询发送方的余额
curl -X GET http://localhost:3001/balance/0x1234567890abcdef1234567890abcdef12345678

# 查询接收方的余额
curl -X GET http://localhost:3001/balance/0xabcdefabcdefabcdefabcdefabcdefabcdef

# 使用返回的交易哈希查询交易状态
curl -X GET http://localhost:3001/transaction/0x5dcjqucob9o



# 常见文件及解决

## 1.accounts.json 务必有账号信息不然链起不来

   内容样例
   {
  "accounts": {
    "0x1234567890abcdef1234567890abcdef12345678": 1000,
    "0xabcdefabcdefabcdefabcdefabcdefabcdef": 500
  },
  "0x1234567890abcdef1234567890abcdef12345678": 16110,
  "0xabcdefabcdefabcdefabcdefabcdefabcdef": 290
}


curl -X POST http://192.168.100.100:3001/transaction \
  -H "Content-Type: application/json" \
  -d '{
    "from": "0x1234567890abcdef1234567890abcdef12345678",
    "to": "0xabcdefabcdefabcdefabcdefabcdefabcdef",
    "amount": "10",
    "privateKey": "yourPrivateKey"
  }'

  ##2.多线程挖矿
  1. 获取 CPU 核心数：使用 os.cpus().length 获取可用的 CPU 核心数，并根据这个数量启动相应数量的 Worker 线程。
  2. mineWithWorkers 方法：创建一个新的方法 mineWithWorkers，它会启动多个 Worker 线程并返回所有线程的挖矿结果。
  3. 挖矿逻辑：在 startMining 方法中，使用 mineWithWorkers 方法来并行挖矿，并处理每个挖到的区块。
  4.新建了minerWorker.ts文件,代码里用了require导入；没有导入自己定义的类（如果引入，会出问题）；简化了mineBLOCK()参数只有difficulty number类型； 其他类如block是内容使用，不出现在参数中。
  5.为什么用require导入而不是import？因为在 Node.js 中，默认情况下，JavaScript 文件被视为 CommonJS 模块，而不是 ES 模块。import 语句是 ES 模块的特性，因此在 CommonJS 模块中使用 import 会导致错误。
   在主线程中，可能因为你的 Node.js 环境配置或文件扩展名（例如 .mjs）使其被识别为 ES 模块，而在 Worker 线程中，默认情况下它仍然被视为 CommonJS 模块。 
   本项目tsconfig.json文件中配置了 "module": "commonjs"，因此在 Worker 线程中，我们需要使用 require 语句来导入模块。

##3.config.json 区块链配置信息,通过读取config.json文件获取区块链配置信息。
{
    "blockchain": {
      "chainDataPath": "./chaindata/blockchain.json",  // 区块链数据文件路径
      "difficulty": 5,                                // 挖矿难度
      "miningInterval": 5000,                        // 挖矿间隔时间
      "blockReward": 10                             // 区块奖励
    },
    "network": {
      "serverIP": "192.168.100.100",             // 区块链server节点 IP
      "p2pServerPort": 6001,                      // 区块链p2p服务端口
      "rpcPort": 3001,                            // 区块链rpc服务端口
      "p2pMinerIP": "192.168.100.100",            // 区块链p2p挖矿节点 IP
      "p2pMinerPort": 6003,                       // 区块链p2p挖矿节点端口
      "minerIP": "192.168.100.100",               // 区块链挖矿节点 IP
      "peers": ["ws://localhost:6003"]          // 区块链p2p节点列表
    },
    "wallet": {
      "minerAddress": "miner1"                    // 挖矿地址
    },
    "mining": {
      "algorithm": "pow",                          // 挖矿算法
      "cpuThreads": 4                                  // CPU 线程数
    }
  }