---
lang: zh
slug: dgx-spark
title: '简单测一下 DGX Spark'
date: 2026-07-18
description: "在 NVIDIA DGX Spark（GB10）上实测了 Qwen 3.6 系列的 27B 与 35B-A3B 两个模型，对比推理后端 llama.cpp（Q4_K_M / Q8_0）和 vLLM（原生 FP8）在不同并发下的性能表现。"
categories: ['Machine Learning']
tags: ['LLM', 'Benchmark']
---

![_NVIDIA DGX Spark 主机与手办](https://pic.aspi-rin.top/2026/11/0e7d56d4fb520d0ad30690b6ddd24b71.jpg)

在 NVIDIA DGX Spark（GB10）上实测了 Qwen 3.6 系列的 27B 与 35B-A3B 两个模型，对比推理后端 llama.cpp（Q4_K_M / Q8_0）和 vLLM（原生 FP8）在不同并发下的性能表现。

## TLDR

测试时间：2026/07/18

**有并发需求建议选 vLLM；如果是单并发个人使用，llama.cpp Q4 更快。**

具体表现如下：

- Qwen 3.6 27B：1～2 并发时 llama.cpp Q4 领先；从 4 并发起 vLLM 反超，8 并发时总吞吐比 Q4 快 40.7%，比 Q8_0 快 97%。
- Qwen 3.6 35B-A3B：由于每次激活的参数量较小，llama.cpp Q4 的优势延续到了 4 并发；直到 8 并发 vLLM 才完成反超，总吞吐比 Q4 快 15.3%，比 Q8_0 快 38.7%。
- 并发扩展性：并发从 1 升至 8，vLLM 的总吞吐提升 3～5 倍，llama.cpp 为 2～3 倍，vLLM 的批处理与调度优势在高并发下更明显。

## 测试环境与配置

DGX Spark 搭载的 GB10 采用 Blackwell 架构，原生支持 FP8 Tensor Core；llama.cpp 的 Q4_K_M 和 Q8_0 则主要依赖自身的自定义 CUDA kernel。

为了尽量保持对比公平，三种方案均开启了 MTP（Multi-Token Prediction，每次 2 个 draft tokens），并使用 AIPerf 以「512 输入 + 128 输出」的固定负载，在 1 / 2 / 4 / 8 四个并发档位下各测一轮，共 24 组数据。

精度对齐与环境说明：

- 8-bit 精度说明：llama.cpp 的 Q8_0 由 vLLM 的 FP8 权重通过 `convert_hf_to_gguf.py --outtype q8_0 --fp8-as-q8` 原地转换而来，MTP 模块一并转换（llama.cpp 启动参数为 `-spec-type draft-mtp --spec-draft-n-max 2 --spec-draft-p-min 0`）。虽然同为 8-bit，但 Q8_0 属于整数分块量化，FP8 属于 E4M3 浮点格式，底层数值表示与计算核心仍有差异，仅作为实际部署选型的参考。
- 软件版本（测试时间：`2026-07-17T09:28:52+09:00`）：
  - 平台：NVIDIA DGX Spark / GB10
  - llama.cpp：`version: 1 (a320cbf) | built with GNU 13.3.0 for Linux aarch64`
  - vLLM / PyTorch / CUDA：`0.25.1` / `2.11.0+cu130` / `13.0`
  - 压测工具：AIPerf `0.11.0`

### 模型配置与压测参数

| 运行时             | Qwen 27B    | Qwen 35B-A3B | MTP            |
| --------------- | ----------- | ------------ | -------------- |
| vLLM            | 原生 FP8 E4M3 | 原生 FP8 E4M3  | 2 draft tokens |
| llama.cpp（Q4）   | GGUF Q4_K_M | GGUF Q4_K_M  | 2 draft tokens |
| llama.cpp（Q8_0） | GGUF Q8_0   | GGUF Q8_0    | 2 draft tokens |

| 压测参数         | 设定值                                |
| ------------ | ---------------------------------- |
| API          | OpenAI 兼容 Chat Completions，流式输出    |
| 输入长度         | 合成 512 tokens，标准差 0                |
| 输出长度         | 128 tokens，标准差 0，`ignore_eos=true` |
| 并发数          | 1 / 2 / 4 / 8                      |
| 请求数          | c1 / c2 / c4 各 16 个；c8 为 32 个      |
| 预热           | 每档 2 个请求，预热并发与正式并发一致               |
| 随机种子         | 20260717                           |
| 温度           | 0                                  |
| MTP          | 三种方案均为 2 draft tokens              |
| 最大单请求上下文     | 4096 tokens                        |
| Prefix cache | 关闭                                 |

- **llama.cpp 固定参数（Q4、Q8_0 通用）**：8 个 slot，总上下文 32768，batch 4096，ubatch 1024，K/V cache 使用 Q8_0，开启 continuous batching，Flash Attention 自动选择。
- **vLLM 固定参数**：`max-num-seqs 8`，`max-num-batched-tokens 4096`，其余生成配置沿用 vLLM 默认值。

## Qwen 3.6 27B：4 并发成为分水岭

指标：**总输出 TPS** 为整机每秒生成的 token 数（含首字等待），用于衡量整体吞吐；**用户 TPS** 为单个请求视角的生成速度；**TTFT** 为首字延迟；**ITL** 为 token 之间的生成间隔，数值越小流式输出越流畅；**平均延迟**为单个请求从发出到接收完毕的总耗时。

| 运行时 | 并发 | 总输出 TPS | 用户 TPS | TTFT avg | ITL avg | 平均延迟 |
| --- | --- | --- | --- | --- | --- | --- |
| llama.cpp Q4_K_M | 1 | 19.60 | 23.20 | 1035.39 ms | 43.24 ms | 6527.07 ms |
| llama.cpp Q8_0 | 1 | 14.93 | 16.89 | 1034.30 ms | 59.33 ms | 8569.72 ms |
| vLLM FP8 | 1 | 15.21 | 16.27 | 586.83 ms | 61.60 ms | 8410.17 ms |
| llama.cpp Q4_K_M | 2 | 33.97 | 19.37 | 942.14 ms | 51.86 ms | 7527.93 ms |
| llama.cpp Q8_0 | 2 | 26.01 | 14.04 | 685.19 ms | 71.53 ms | 9769.70 ms |
| vLLM FP8 | 2 | 30.05 | 16.61 | 820.69 ms | 60.28 ms | 8476.22 ms |
| llama.cpp Q4_K_M | 4 | 42.37 | 12.04 | 893.97 ms | 87.13 ms | 11959.90 ms |
| llama.cpp Q8_0 | 4 | 29.39 | 8.21 | 1165.63 ms | 125.73 ms | 17133.14 ms |
| vLLM FP8 | 4 | 50.76 | 15.08 | 1497.18 ms | 66.62 ms | 9957.74 ms |
| llama.cpp Q4_K_M | 8 | 54.99 | 8.38 | 2085.49 ms | 126.37 ms | 18134.90 ms |
| llama.cpp Q8_0 | 8 | 39.19 | 5.97 | 2654.15 ms | 174.85 ms | 24860.10 ms |
| vLLM FP8 | 8 | 77.38 | 12.85 | 2977.70 ms | 78.57 ms | 12956.54 ms |

在 1 和 2 并发时，Q4 凭借更低的访存开销取得更高的单流速度，用户 TPS 达到 23.20 tokens/s；但从 4 并发开始，vLLM 的总吞吐与单用户吐字间隔（ITL 仅 66.62 ms）便已全面领先。

到了 8 并发，差距进一步扩大：vLLM 的首字延迟虽然升至接近 3 秒，但开始输出后 ITL 仍稳定在 78.57 ms（约 12.85 tokens/s），整机总吞吐达到 77.38 tokens/s；而 llama.cpp Q4 与 Q8_0 的 ITL 分别下降至 126.37 ms 和 174.85 ms，流式输出已有明显卡顿感。

| 并发  | Q4 vs vLLM | Q8_0 vs vLLM | Q8_0 vs Q4 | 吞吐领先方        |
| --- | ---------- | ------------ | ---------- | ------------ |
| 1   | +28.8%     | -1.9%        | -23.8%     | llama.cpp Q4 |
| 2   | +13.0%     | -13.4%       | -23.4%     | llama.cpp Q4 |
| 4   | -16.5%     | -42.1%       | -30.6%     | vLLM         |
| 8   | -28.9%     | -49.4%       | -28.7%     | vLLM         |

从 1 并发到 8 并发的吞吐扩展倍数：

| llama.cpp Q4         | llama.cpp Q8_0       | vLLM FP8             |
| -------------------- | -------------------- | -------------------- |
| 2.81x（19.60 → 54.99） | 2.62x（14.93 → 39.19） | 5.09x（15.21 → 77.38） |

## Qwen 3.6 35B-A3B MoE：低并发下 Q4 优势更持久

切换到 35B-A3B 这类 MoE 模型后，由于每个 token 实际激活的参数量大幅减少，整体生成速度显著提升——单并发下 Q4 的用户 TPS 达到 93.10 tokens/s，TTFT 也降至 350 ms 以内。

| 运行时              | 并发  | 总输出 TPS | 用户 TPS | TTFT avg   | ITL avg  | 平均延迟       |
| ---------------- | --- | ------- | ------ | ---------- | -------- | ---------- |
| llama.cpp Q4_K_M | 1   | 74.74   | 93.10  | 344.43 ms  | 10.76 ms | 1710.40 ms |
| llama.cpp Q8_0   | 1   | 61.33   | 74.96  | 388.29 ms  | 13.36 ms | 2085.16 ms |
| vLLM FP8         | 1   | 57.44   | 63.79  | 231.77 ms  | 15.70 ms | 2225.99 ms |
| llama.cpp Q4_K_M | 2   | 109.39  | 59.92  | 193.25 ms  | 16.80 ms | 2326.42 ms |
| llama.cpp Q8_0   | 2   | 90.23   | 49.29  | 221.39 ms  | 20.34 ms | 2804.17 ms |
| vLLM FP8         | 2   | 89.97   | 50.29  | 304.14 ms  | 19.93 ms | 2835.20 ms |
| llama.cpp Q4_K_M | 4   | 121.88  | 34.02  | 333.93 ms  | 30.17 ms | 4164.92 ms |
| llama.cpp Q8_0   | 4   | 101.05  | 27.92  | 385.79 ms  | 36.52 ms | 5024.34 ms |
| vLLM FP8         | 4   | 110.90  | 30.86  | 415.50 ms  | 32.61 ms | 4557.01 ms |
| llama.cpp Q4_K_M | 8   | 148.23  | 22.81  | 874.19 ms  | 46.04 ms | 6720.99 ms |
| llama.cpp Q8_0   | 8   | 123.17  | 18.59  | 1052.60 ms | 55.99 ms | 8162.93 ms |
| vLLM FP8         | 8   | 170.86  | 24.90  | 739.57 ms  | 40.58 ms | 5893.06 ms |

MoE 模型在低并发下更容易受限于内存带宽，4-bit 权重的体积优势因此被进一步放大：1～4 并发区间内，llama.cpp Q4 持续领先，Q8_0 在 1～2 并发时也与 vLLM FP8 基本持平甚至略占优势。直到 8 并发，vLLM 才凭借更高的批处理调度效率完成反超（总吞吐 170.86 tokens/s），但领先幅度小于 27B 稠密模型。

| 并发 | Q4 vs vLLM | Q8_0 vs vLLM | Q8_0 vs Q4 | 吞吐领先方 |
| --- | --- | --- | --- | --- |
| 1 | +30.1% | +6.8% | -17.9% | llama.cpp（Q4 与 Q8_0 均领先） |
| 2 | +21.6% | +0.3% | -17.5% | llama.cpp Q4 领先，Q8_0 基本持平 |
| 4 | +9.9% | -8.9% | -17.1% | Q4 领先，Q8_0 落后 vLLM |
| 8 | -13.2% | -27.9% | -16.9% | vLLM |

1 并发到 8 并发的吞吐扩展倍数相对 27B 模型也更为平缓：

| llama.cpp Q4          | llama.cpp Q8_0        | vLLM FP8              |
| --------------------- | --------------------- | --------------------- |
| 1.98x（74.74 → 148.23） | 2.01x（61.33 → 123.17） | 2.97x（57.44 → 170.86） |

## MTP 接受率

为验证三种方案中的投机采样（2 draft tokens）均正常生效、避免因权重转换或实现差异影响对比结果，测试期间也同步统计了 MTP 的接受率：

| 运行时 | 模型 | Draft/Generated tokens | Accepted tokens | 接受率 |
| --- | --- | --- | --- | --- |
| llama.cpp Q4 | Qwen 27B | 8657 | 6794 | 78.5% |
| llama.cpp Q4 | Qwen 35B-A3B | 8832 | 6705 | 75.9% |
| llama.cpp Q8_0 | Qwen 27B | 8716 | 6767 | 77.6% |
| llama.cpp Q8_0 | Qwen 35B-A3B | 8661 | 6797 | 78.5% |
| vLLM FP8 | Qwen 27B | 8700 | 6890 | 79.2% |
| vLLM FP8 | Qwen 35B-A3B | 8778 | 6851 | 78.0% |

三者的接受率非常接近，均维持在 **76%～79%** 之间。这说明投机采样在各运行时中的收益基本一致，上述性能差异主要源于量化位宽、计算核心与并发调度机制本身。

> 附统计口径：llama.cpp 侧直接读取服务日志里的 `generated` 与 `accepted` 计数器，按服务生命周期汇总了全部正式及预热请求；vLLM 侧先在启动日志中确认 `SpeculativeConfig(method='mtp', num_spec_tokens=2)` 与 `Detected MTP model` 已生效，再通过压测前后的 Prometheus 计数器差值计算出 `draft` 和 `accepted` 的 token 数。
