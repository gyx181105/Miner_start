import { fork } from 'child_process';
import { cpus } from 'os';

// CPU 密集型任务函数，模拟高负载
function cpuIntensiveTask() {
  let result = 0;
  // 无限循环，执行大量的计算任务
  while (true) {
    for (let i = 0; i < 1e6; i++) {
      result += Math.sqrt(i * Math.random());
    }
  }
}

// 创建新的子进程
function createWorker() {
  const worker = fork(__filename, ['worker']); // 传递'worker'参数给子进程
  worker.on('exit', () => console.log('Worker exited'));
}

// 判断是否是主进程或子进程
if (process.argv[2] === 'worker') {
  // 子进程：执行CPU密集任务
  cpuIntensiveTask();
} else {
  // 主进程：获取CPU核心数，并创建相应的子进程
  const numWorkers = cpus().length;
  console.log(`Starting ${numWorkers} workers...`);
  for (let i = 0; i < numWorkers; i++) {
    createWorker();
  }
}