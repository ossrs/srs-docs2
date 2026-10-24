---
slug: native-windows
title: SRS - How AI Made SRS 8 Run Natively on Windows
authors: []
tags: [srs, ai, windows, testing]
custom_edit_url: null
---

# How AI Made SRS 8 Run Natively on Windows

SRS 8 now runs natively on Windows. AI built this large feature: about 15,000 lines in one day.
It added no new bugs, and it broke no existing code.

{/* truncate */}

## What Native Windows Means

`srs.exe` is built with MSVC for Windows x64 and runs as a console program. It needs no Cygwin and
no WSL. It supports the same protocols and features as Linux:

- RTMP, RTMPS, HTTP-FLV, HTTP-TS, HTTPS, HLS (TS and fMP4) and DASH.
- WebRTC WHIP and WHEP, with AAC and Opus transcoding.
- SRT, including SRT to RTMP, plus RTSP and GB28181.
- DVR, VOD, the HTTP API, callbacks, the exporter, edge and forward.
- Ingest and transcode with `ffmpeg.exe`.

You can also open SRS in Visual Studio, then build, run and debug it there. You can even step into
the coroutine switch of State Threads, which is written in assembly.

## How Much Code Changed

Counting only the direct changes, it is about 15,000 lines in two pull requests:

- [ST#40](https://github.com/ossrs/state-threads/pull/40): native Windows support in State
  Threads, the coroutine library under SRS. About 5,000 lines.
- [SRS#4787](https://github.com/ossrs/srs/pull/4787): SRS 8.0 on native Windows. About 10,000
  lines.

Before that came about 120,000 lines of test code:

- State Threads test coverage went up to 96%. About 10,000 lines.
- [SRS#4785](https://github.com/ossrs/srs/pull/4785): performance tools and tests. About 16,000
  lines.
- [SRS#4780](https://github.com/ossrs/srs/pull/4780): automated OBS tests. About 6,000 lines.
- [SRS#4772](https://github.com/ossrs/srs/pull/4772): the black-box integration test suite. About
  78,000 lines.
- [SRS#4746](https://github.com/ossrs/srs/pull/4746): basic feature tests. About 9,000 lines.

Even the 15,000 direct lines are mostly tests. Only about 3,000 lines aren't tests:

- SRS: about 1,500 lines, mostly the platform layer in `srs_core_platform.cpp`.
- ST: about 1,200 lines, mostly the platform code in `event.c`, `io.c` and `md_win64.asm`.

That is why AI can work through a whole night and hundreds of changes without breaking anything.
The tests catch mistakes with very high probability, for AI and for people. Very high means maybe
99.9%, not 100%.

## How Much It Cost

I pay for the Claude $100 monthly plan, so the real cost is $100 a month. That is almost nothing
compared to the cost of an engineer.

Claude also reports what each task would cost in API tokens. Windows took two runs, because my login
expired in the middle and I had to restart:

- The first run cost about $152 and did about a third of the task, until the login expired.
- After I logged in again, the second run finished the task for about $226.

That adds up to about $370 in token value, which used about 42% of my weekly quota.

Friends often tell me one task uses up their whole quota. I think there are a few reasons:

- **Use a monthly plan, not the API.** My $100 plan would probably cost several thousand dollars on
  the API.
- **Use at least the $100 plan, not the $20 one.** Don't expect to build something big for almost
  nothing.
- **Make the AI's work smaller.** See the `srs-autopilot` and `srs-develop` skills. They index the
  code and docs, use subagents to keep the context small, and restart agents from a task file so
  each context window stays short.

Using AI doesn't mean typing "build me a rocket" into a chat window and finding a rocket at your
door the next day. I wrote about the tools and the preparation in
[How AI Maintains SRS with Higher Quality Code](/blog/ai-autopilot). I don't claim my workflow is
the best. AI is still improving fast, and some of these tools may be out of date a year from now.
But I don't think you will be able to get a rocket from one sentence then, either.

## Is It Perfect?

No. Even with enough time and enough senior engineers, code is never 100% free of problems, and
this was one day of AI work. When I review AI code, I sometimes find problems.

**A shortcut to pass a weak test.** For an RTSP callback, AI called `on_client` and then
`on_disconnect` right after it. That is clearly wrong, even if you don't know what the right flow
is. The test only checked the callback data, not the protocol steps in between, so AI found a
shortcut to make it pass. AI can fix this kind of bug itself: another AI that reviews the change
without the original context finds it. So I added an audit workflow to the skills.

**Strange but harmless code.** In another change, the code was correct but redundant: one call was
enough, and the rest should be deleted. Leaving it in causes no bug, and the tests pass. AI may not
find this by checking itself, though smarter models might. But a person sees it at a glance, and it
is easy to review.

**A test video that made the numbers look better.** In the performance work, AI first used the SRS
default test video. That video is VBR, and bitrate changes add noise to performance results, so it
should be CBR. AI didn't notice. After it optimized the code, it reported a 9% improvement. With a
CBR video and no bitrate noise, the gain was about 5%. Did AI exaggerate its own results? I don't
expect AI to solve this kind of problem soon. It takes odd, niche domain knowledge. AI companies
aren't trying to build a god who knows everything. Solving most problems is good enough, and a
person can cover the odd corners at a low total cost.

**A bad design that looked like a win.** AI also proposed a performance change that gave about 10%
more connections. But it sent cached data when a read happened, and any experienced programmer
knows that is a bad design. When I discussed it with AI, AI also agreed it was a strange design and
not worth it. I reverted it.

## You Don't Use Windows?

Some people may say: I don't use Windows, so this feature is no use to me. I think a better
question is: what does it teach you that AI did this? Here is what I learned.

**When writing code is no longer hard, ideas matter.** An idea is a choice, and a choice comes from
what you think is worth doing. I think native Windows is worth it. Many programmers use Windows.
Not everyone can afford an expensive Mac or likes the Mac tools. Don't they deserve support? They
may not build media servers. They may write business code, or run operations, and only want to
debug or test with SRS. Making them use WSL is a lot of friction. With native Windows, using SRS
gets much easier. If it costs us little and helps others, how is it not worth it?

**It is a hard problem, and it is not my field.** Even if only 3,000 lines changed, those are
3,000 lines in ST and SRS, which is not simple. And I don't know Windows well. I program on Linux,
use a Mac, and haven't used Windows for more than ten years. If I am not a Windows expert, how can I
correct AI's Windows mistakes, or stop it from adding bugs? But if AI could only do what I'm already
good at, it would be very limited. What I find interesting is that AI can do what I'm not good at,
and I can still deliver a high-quality result and learn on the way. AI is no longer an assistant.
It is a partner. It is very different from me, and not even human, but together we deliver results
beyond what either of us could do alone.

**If Windows is done, what else is out of reach?** I look back at the list of important SRS
weaknesses I wrote before. Most look like one night of AI work. Some are harder, so maybe three
nights.

## What Should We Worry About?

When AI does my work and walks the road I used to walk, where do I go next? Should I worry about my
career?

Two years ago I did worry. AI wrote better and better code, and I was afraid I would have no code to
write. Now I worry less and less, because I have accepted that there is no code left for me to
write. When death comes, what else can you do but accept it? And I really don't mind whether I
type the code myself. Too many interesting things are happening.

As I use AI to run this project and its community, I see other things I can do, even if AI does all
the coding:

- **Share how to let AI replace me.** AI can't tell you how to replace yourself. A person still has
  to find the way out, and learn how to maintain a project with AI. That is useful for other
  projects, open source or not.
- **Make the choices.** AI can build any feature, but someone has to choose. For multithreading,
  there are many designs. We can't build them all, and we can't pick one at random and start over.
  The choice depends on values, and AI can't make it for you.
- **Review and keep learning.** When I look at AI code that I didn't write, I still see at a glance
  what is not quite right, and what may cause problems later. That works even in languages I don't
  know well. I don't write the code, but I still learn when I review it.
- **Write for people.** Before, I had no time to write articles, because I was busy with small
  coding chores. Now AI does the chores, and I have the time to write every word myself. When the
  web is full of AI-generated text, doesn't writing by a person feel different?

## Changes in the Community

AI also helps me maintain the community, and the community is more active. Issues and pull requests
are more active than before.

Of course, people also use AI to write their issues and pull requests. That is surely where things
are going. Nobody will write them all by hand. And if you read all those AI-written issues and pull
requests yourself, you will go crazy. I have a skill for them, and I find that AI handles them
better. I keep my AI from being steered by the other person's AI. First my AI extracts the ideas
from an issue or a pull request. Then it implements them its own way. Finally, it looks at the
other AI's change to learn from anything it missed.

The project and the community are now a test: can we and AI keep it alive for another ten years? I
am not sure, and if the project dies, that is fine. It is only an open source project.

## What's Next

AI found about 135 bugs, and SRS is more stable than before. SRS 7.0 should be stable by the end of
this year. We used to release a version about every two years. In the future it may be every six
months or every year. When the main features are done, a version enters its release cycle, so you
get a stable version for production.

Most of the SRS 8.0 features are done. WebRTC edge will probably come next, which completes the
cluster features. If you run an origin, a proxy and an edge on one machine, that is a multi-process
way to scale, much better than multithreading.

We may also rewrite SRT, add MoQ, or add a proxy server in Rust. These are experiments, and they
may go to 9.0. We may also improve the apps around SRS, such as DJI support.

What is clear is that this year we will finish the important, complex features that were missing,
and prove that AI can maintain this project. Next year, the main direction is to let AI maintain
your SRS service in production. Writing code and running a service are two very different things.

That doesn't mean the work will ever be done. It never is, and an interesting project only gets
more interesting.

## Try It

Build SRS on Windows from source, in a Git Bash with the MSVC x64 environment:

```bash
git clone -b develop https://github.com/ossrs/srs.git
cd srs
bash skills/srs-develop/scripts/srs-windows-runner.sh build
cd trunk
./objs/windows/srs.exe -c conf/console.conf
```

Starting with the next SRS 8.0 release, every release on the
[releases](https://github.com/ossrs/srs/releases) page includes a Windows zip,
`SRS-Windows-x86_64-<version>.zip`, which needs no DLLs. For the tools, Visual Studio, console
control and limits, see the
[Windows doc](https://github.com/ossrs/srs/blob/develop/skills/internal-docs-for-srs/references/cpp-docs/doc/windows.md).
