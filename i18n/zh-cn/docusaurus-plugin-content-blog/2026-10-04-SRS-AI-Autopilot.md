---
slug: ai-autopilot
title: SRS - 我两周没搞定的ST，AI九小时全自动搞定了
authors: []
tags: [srs, ai, testing, autopilot]
custom_edit_url: null
---
# 我两周没搞定的ST，AI九小时全自动搞定了

AI现在可以连续几个小时全自动开发SRS，代码质量不仅没有变差，反而更好了。AI写的代码大部分是测试，而不是功能，这些测试正是我们能信任AI的原因。

{/* truncate */}

## A Bug I Gave Up On

大约两年前，我把SRS底层的协程库State Threads（ST）通过Cygwin移植到Windows。协程切换没问题，但只要开启SRT，SRS就会崩溃。查了两周，才找到原因：SRT使用了C++异常，而Windows上的C++异常是基于SEH实现的，SEH依赖一些寄存器，协程切换时必须保存和恢复这些寄存器。我找不到足够的资料说明这些寄存器，最终只好放弃了。

最近我拿同样的问题问AI，它6分钟就写了一个测试程序，说已经解决了。然后我用一个新的Skill，`srs-autopilot`，让它全自动运行。九个小时后，它把ST移植到了原生Windows平台，没有用Cygwin，C++异常的测试也通过了。

这是AI第一次解决了我没解决的问题。但快并不是最有意思的地方。

## The Real Question Is Trust

让AI无人监督地运行很容易：Claude有`--dangerously-skip-permissions`参数，Codex有`--yolo`参数。你可以让AI把SRS用Go或Rust重写，甚至还能跑起来。但这真的是同一个SRS吗？还能继续维护吗？敢上线吗？

人写的代码，如果变更比较小，有测试，而且有人做Code Review，一般就可以放心上线。AI的变更从来都不小，也没人能逐行Review这么多代码。剩下唯一真正的保障，就是非常完整的测试。

## Most of What AI Writes Is Tests

以AI最近实现的一个功能为例：WebRTC的RFC 4588 RTX，提交[3fc1810a4](https://github.com/ossrs/srs/commit/3fc1810a46870d9bb5341986e16b26b70a91a58f)（[#4746](https://github.com/ossrs/srs/pull/4746)），新增了8928行代码：

| 部分 | 新增行数 | 占比 |
|---|---:|---:|
| `trunk/src`中的功能代码 | 451 | 5.1% |
| `trunk/src/utest`中的C++单元测试 | 2245 | 25.1% |
| `trunk/3rdparty/srs-bench`中的Go集成测试 | 819 | 9.2% |
| `skills/srs-develop/scripts`中的端到端测试脚本 | 1823 | 20.4% |
| `tools/pion-whip`和`tools/pion-whep`中的WHIP和WHEP测试工具，包括工具自身的单元测试 | 3423 | 38.3% |
| 配置、文档和其他 | 167 | 1.9% |

测试和测试工具共8310行，占这次变更的93.1%，用来证明451行功能代码是正确的：每一行功能代码，大约有18行测试。没有哪个人类维护者是这样工作的。人一般是先写功能，有时间再补几个测试。AI先写测试，而且覆盖所有情况，因为对它来说，写测试几乎没有成本。

ST也是一样：AI把它的测试覆盖率从45%提升到了96%，还为它的关键功能增加了集成测试。

这些测试并不是凑数的测试。人给已有代码补测试时，测试往往会重复代码的错误：代码是错的，测试也认为它是对的。AI可以对照文档、RFC和其他实现来检查代码，所以它写的测试能真正找到bug。SRS的很多bug就是这样找到的。即使是解决bug，也要先写一个测试证明这个bug存在，否则可能解决的是一个并不存在的问题。

## Tests Must Be Local and Fast

保证AI正确的测试，必须能在本地运行。用GitHub Actions测试一次变更，每轮至少要20分钟。在本地，全部测试只需要大约1分钟，而且AI能看到所有的结果，所以它能很快发现并纠正自己的错误。

只有单元测试是不够的，功能和接口需要真正的集成测试。SRS有回归测试、黑盒测试和脚本测试，它们会启动真实的SRS，用FFmpeg和SRS Bench等工具来测试。以前跑一轮完整的测试要20分钟；改进了端口分配之后，多个SRS可以并行运行，跑完一轮只要1分钟。缺少工具时，就让AI自己写。RTX提交中的WHIP和WHEP测试工具，就是AI写的。

有了这些测试，我可以放心地合并AI的大变更。没有这些测试，就只能祈祷模型永远不犯错误。

## Testable Code Is Maintainable Code

要测试所有代码，代码就必须能被Mock：依赖接口，而不是依赖实现。现在SRS的每个类都实现了一个接口，而且只依赖其他接口，所以测试可以把任何依赖替换成Mock对象，完全控制它。

这次重构改动了大量的代码，非常无聊，没有人愿意主动去做。AI做了。结果是代码更容易理解、测试和修改，无论对AI还是对人。

## Skills Turn the Process into Rules

只有测试还不够，AI还需要定义好的工作流。SRS把工作流写成了Skill，放在[skills](https://github.com/ossrs/srs/tree/develop/skills)目录中：

- `srs-develop`是代码和文档的索引，AI不用搜索整个项目就能找到正确的文件，也不会让无关的内容填满上下文。它还要求测试驱动开发：先写测试，再写代码。
- `srs-autopilot`根据一个计划文件执行大型任务。主Agent先和我讨论背景和目标，写好计划，然后每个任务启动一个Subagent。每个Subagent实现、测试并提交一个任务。主Agent保持很小，只检查进度，所以可以连续运行几个小时。

Skill不过就是文档。你也可以每次都把这些话和AI说一遍，但有了Skill，你只需要说一次。

## What the Maintainer Still Does

如果AI能自己正确地完成工作，那我还需要做什么？

- **读计划。** 计划说明了背景和步骤，基本不涉及代码。读RTX的计划，让我学到了RTX是什么、如何工作，也让我知道AI是否理解了这个问题。如果有遗漏或者说得不清楚，那就是bug的来源。
- **做选择。** 理论上RTX也可以用于音频，最初的计划也包括了音频。但Chrome只对视频使用RTX，所以我选择只支持视频。这些选择来自经验，这也是同一个模型，不同的人用会得到不同结果的原因。
- **异步Review。** 大部分测试代码我不Review，因为AI会遵守测试规范。但核心变更我一定会Review。AI每完成一个任务就提交，并更新计划；另一个Agent帮我在单独的Review分支上Review这些提交，同时主循环继续运行。我不会阻塞AI，AI也不用等我。

## Conclusion

AI就像挖掘机。有了挖掘机，就不再需要用锄头挖了。以前，我只能维护Linux版本的SRS；现在，同样的时间，我可以维护跨平台的服务器和配套的客户端，而且代码的测试比我手写的时候任何时候都更完整。