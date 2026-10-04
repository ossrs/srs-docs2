---
slug: ai-autopilot
title: SRS - Faster and Better, How AI Maintains SRS with Higher Quality Code than Humans
authors: []
tags: [srs, ai, testing, autopilot]
custom_edit_url: null
---

# Faster and Better: How AI Maintains SRS with Higher Quality Code than Humans

AI now develops SRS on its own for hours, and the code gets better, not worse. Most of
what AI writes is tests, not features, and those tests are why we can trust it.

{/* truncate */}

## A Bug I Gave Up On

About two years ago, I ported State Threads (ST), the coroutine library under SRS, to Windows with
Cygwin. Coroutine switching worked, but SRS crashed as soon as SRT was enabled. After two weeks I
found the cause: SRT uses C++ exceptions, and on Windows C++ exceptions are built on SEH, which
depends on registers that a coroutine switch must save and restore. I could not find enough
documentation about those registers, so I gave up.

Recently I asked AI about the same problem. In 6 minutes it wrote a test program and said it was
fixed. Then I let it run on its own with a new skill, `srs-autopilot`. Nine hours later it had
ported ST to native Windows, without Cygwin, and the C++ exception test passed.

This is the first time AI solved a problem that I could not. But speed is not the interesting
part.

## The Real Question Is Trust

Running AI without supervision is easy. Claude has `--dangerously-skip-permissions` and Codex has
`--yolo`. You can ask AI to rewrite SRS in Go or Rust, and it might even run. But is it really
the same SRS? Can you maintain it? Would you put it in production?

Code written by people is usually safe to ship when the change is small, it is tested, and someone
reviews it. AI changes are never small, and nobody can review that much code line by line. The only
real guarantee left is very complete tests.

## Most of What AI Writes Is Tests

Take a recent AI feature, RFC 4588 RTX for WebRTC, in commit
[3fc1810a4](https://github.com/ossrs/srs/commit/3fc1810a46870d9bb5341986e16b26b70a91a58f)
([#4746](https://github.com/ossrs/srs/pull/4746)). It adds 8,928 lines:

| Part | Lines added | Share |
|---|---:|---:|
| Feature code in `trunk/src` | 451 | 5.1% |
| C++ unit tests in `trunk/src/utest` | 2,245 | 25.1% |
| Go integration tests in `trunk/3rdparty/srs-bench` | 819 | 9.2% |
| End-to-end test scripts in `skills/srs-develop/scripts` | 1,823 | 20.4% |
| WHIP and WHEP test tools in `tools/pion-whip` and `tools/pion-whep`, with their own unit tests | 3,423 | 38.3% |
| Config, docs, and others | 167 | 1.9% |

Tests and test tools are 8,310 lines, 93.1% of the change, to prove that 451 lines of feature code
are correct: about 18 lines of tests for every line of feature. No human maintainer
works like that. People write the feature and add a few tests if there is time. AI writes the
tests first and covers everything, because writing tests costs it almost nothing.

The same happened to ST: AI raised its test coverage from 45% to 96%, and added integration tests
for its key features.

These are not weak tests. When a person adds tests to existing code, the tests often repeat the
code's mistakes: the code is wrong and the test agrees with it. AI can check the code against the
documentation, the RFCs, and other implementations, so its tests actually find bugs. Many bugs in
SRS were found this way. Even a bug fix starts with a test that proves the bug exists; otherwise
you might fix a problem that is not there.

## Tests Must Be Local and Fast

The tests that keep AI correct must run locally. A change tested by GitHub Actions takes at least
20 minutes per round. Locally, the whole suite takes about 1 minute, and AI sees every result,
so it finds and fixes its own mistakes quickly.

Unit tests are not enough, because features and APIs need real integration tests. SRS has
regression, black-box, and script tests that start a real SRS and drive it with tools like FFmpeg
and SRS Bench. A full run used to take 20 minutes; after we changed how ports are allocated, many
SRS instances can run in parallel and the full run takes 1 minute. When a tool is missing, AI writes
it. The WHIP and WHEP test tools in the RTX commit were written by AI.

With these tests, I can merge large AI changes with confidence. Without them, you can only hope the
model never makes a mistake.

## Testable Code Is Maintainable Code

To test everything, code must be mockable: depend on interfaces, not implementations. Every class in
SRS now implements an interface and depends only on other interfaces, so a test can replace any
dependency with a mock and fully control it.

This refactoring touched a huge amount of code. It is so boring that no person would volunteer for
it. AI did it. The result is a codebase that is easier to understand, test, and change, for AI
and for people.

## Skills Turn the Process into Rules

Tests alone are not enough. AI also needs a defined workflow, and in SRS that workflow is written as
skills in the [skills](https://github.com/ossrs/srs/tree/develop/skills) directory:

- `srs-develop` is an index of the code and documents, so AI finds the right files without
  searching the whole project and filling its context with unrelated text. It also requires
  test-driven development: write the test first, then the code.
- `srs-autopilot` runs a large task from a plan file. The main agent discusses the background and
  goals with me, writes the plan, and then starts one subagent per task. Each subagent implements,
  tests, and commits one task. The main agent stays small and only checks progress, so the loop can
  run for hours.

A skill is just a document. You could say all of it to AI every time, but a skill means you only
say it once.

## What the Maintainer Still Does

If AI can do the work correctly by itself, what is left for me?

- **Read the plan.** The plan explains the background and the steps, without much code. Reading
  the RTX plan taught me what RTX is and how it works, and showed me whether AI understood the
  problem. If something is missing or unclear, that is where bugs come from.
- **Make the choices.** In theory RTX also works for audio, and the first plan included it. But
  Chrome only uses RTX for video, so I chose video only. These choices come from experience, and
  they are why the same model gives different results for different people.
- **Review asynchronously.** I don't review most test code, because AI follows the test rules. I
  always review core changes. AI commits each finished task and updates the plan; another agent
  helps me review those commits on a separate review branch while the loop keeps running. I never
  block the AI, and it never waits for me.

## Conclusion

AI is like an excavator. Once you have one, you no longer dig with a hoe. Before, I could only
maintain the Linux version of SRS. Now, in the same time, I can maintain a cross-platform server and
its clients, and the code is better tested than it ever was when I wrote it by hand.
