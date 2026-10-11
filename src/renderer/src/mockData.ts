// Fake content for mockApi.ts: lessons, ideas, models. None of it is real lesson content;
// it only has to look and behave like the real thing so the interface can be built and
// screenshot-tested in a plain browser.

import type {
  CodeFile, HardwareInfo, Idea, Lesson, LessonProgress, LessonSummary, LessonType, ModelEntry, Step,
} from '@shared/types';
import { emptyProgress } from '@shared/types';

// ---------------------------------------------------------------- lesson list

const STAGE_TITLES: Record<number, string> = {
  1: 'First programs',
  2: 'Decisions',
  3: 'Loops',
  4: 'Functions',
  5: 'Lists and text',
  6: 'Dictionaries and data',
  7: 'Files and errors',
  8: 'Classes and bigger programs',
  9: 'Python in the real world',
  10: 'Git and GitHub',
  11: 'Other people\'s code',
};

const STAGE_STARTS = [1, 10, 20, 30, 39, 51, 62, 71, 79, 88, 93];

function stageOf(number: number): number {
  let stage = 1;
  STAGE_STARTS.forEach((start, i) => {
    if (number >= start) stage = i + 1;
  });
  return stage;
}

type Row = [number: number, title: string, type: LessonType, newIdea: string, flags?: { online?: boolean; optional?: boolean }];

const ROWS: Row[] = [
  [1, 'Hello, world', 'learn', 'print(), printing several things at once, running a program, the main panels'],
  [2, 'Text', 'learn', 'Strings, quotes, joining with +, repeating with *, \\n for a new line'],
  [3, 'Numbers', 'learn', 'Whole and decimal numbers, + - * /, // and % for sharing and remainders, brackets'],
  [4, 'Variables', 'learn', 'Naming a value, names that explain themselves, = works right to left, changing a value'],
  [5, 'Asking questions', 'learn', 'input(), # comments to label the steps'],
  [6, 'Text is not a number', 'learn', 'str, int, float, converting, why "5" + 5 fails'],
  [7, 'f-strings', 'learn', 'Values inside text, two decimal places, lining up columns'],
  [8, 'Fix it: your first error messages', 'fix', 'Reading SyntaxError, NameError and TypeError, line numbers, unclosed quotes and brackets'],
  [9, 'Project: Fill-in story', 'build', 'Everything so far'],
  [10, 'True and False', 'learn', 'Booleans, == != < > <= >=, = versus =='],
  [11, 'if', 'learn', 'if, the colon, indentation makes a block'],
  [12, 'if and else', 'learn', 'Two branches, exactly one runs'],
  [13, 'elif', 'learn', 'Chains of choices, order matters'],
  [14, 'and, or, not', 'learn', 'Combining conditions'],
  [15, 'Tidying what people type', 'learn', 'Methods: .lower(), .strip(), .upper()'],
  [16, 'Decisions inside decisions', 'learn', 'Nested if'],
  [17, 'Luck', 'learn', 'import random, random.randint()'],
  [18, 'Fix it: colons, indents and logic', 'fix', 'IndentationError, missing colons, branches in the wrong order'],
  [19, 'Project: Rock, Paper, Scissors', 'build', 'Everything so far'],
  [20, 'while', 'learn', 'Repeat while a condition is true, the Stop button, loops that never end'],
  [21, 'Counting and totals', 'learn', '+=, counters, running totals'],
  [22, 'Loops that check input', 'learn', 'while True, break, .isdigit()'],
  [23, 'Mini-build: Guess the Number', 'build', 'Stage 3 so far'],
  [24, 'for and range', 'learn', 'for, range() with start, stop and step, why it stops one short'],
  [25, 'Looping over text', 'learn', 'One letter at a time, len(), in, building a new string'],
  [26, 'Loops inside loops', 'learn', 'Nested loops, end="" to stay on one line'],
  [27, 'Be the computer', 'read', 'Tracing a loop by hand with a variable table'],
  [28, 'Plan before you type', 'skill', 'Putting the steps in order in plain English, then writing code under each'],
  [29, 'Project: Rock, Paper, Scissors, full game', 'build', 'Everything so far'],
  [30, 'Your own commands', 'learn', 'def, calling a function, a first line that says what it does'],
  [31, 'Parameters', 'learn', 'Passing values in'],
  [32, 'Return', 'learn', 'Handing a value back, return versus print, no return gives None'],
  [33, 'Yes-or-no functions', 'learn', 'Returning True or False, using a function in an if'],
  [34, 'Default and named arguments', 'learn', 'Default values, calling by name'],
  [35, 'Where variables live', 'learn', 'Local and global, pass in and return out'],
  [36, 'Functions calling functions', 'learn', 'Breaking one job into small ones, main()'],
  [37, 'Fix it: bugs with no error message', 'fix', 'Print-debugging, stepping through line by line, watching variables'],
  [38, 'Project: The Arcade', 'build', 'Everything so far'],
  // A few later lessons so the mock also shows data files, several code files, the practice
  // service, the terminal, the tests panel, and the online and optional flags.
  [62, 'Reading files', 'learn', 'with open(), reading lines, encoding="utf-8"'],
  [71, 'Your own modules', 'learn', 'Code in two files, importing your own functions'],
  [79, 'Asking a service', 'learn', 'What an API is, requests.get() with params, .json() and .text'],
  [83, 'Command-line programs', 'learn', 'argparse: arguments and optional flags, --help, the terminal panel'],
  [85, 'Your first tests', 'learn', 'pytest, assert, pytest.raises'],
  [88, 'Git: saving snapshots', 'learn', 'What version control is, git init, status, add, commit, log'],
  [91, 'Finding your way round a project', 'read', 'A project\'s page, the README, requirements, the tests folder, git clone', { online: true }],
  [92, 'Your own project online', 'learn', 'A new repository, git remote, git push, git pull', { online: true, optional: true }],
];

const MINUTES: Record<LessonType, number> = { learn: 20, skill: 25, fix: 25, read: 25, build: 60 };

function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export const MOCK_LESSONS: LessonSummary[] = ROWS.map(([number, title, type, newIdea, flags]) => {
  const slug = slugify(title);
  const stage = stageOf(number);
  return {
    id: `${String(number).padStart(3, '0')}-${slug}`,
    number,
    slug,
    title,
    stage,
    stageTitle: STAGE_TITLES[stage] ?? `Stage ${stage}`,
    type,
    minutes: MINUTES[type],
    newIdea,
    online: flags?.online ?? false,
    optional: flags?.optional ?? false,
  };
});

/** The lesson that has hand-made content with every question kind. */
export const RICH_LESSON_ID = '021-counting-and-totals';

// ---------------------------------------------------------------- ideas

const IDEA_ROWS: [key: string, label: string, lesson: number, reminder: string, example: string][] = [
  ['print', 'print()', 1, 'print() shows something on the screen. Commas let you print several things at once.', 'print("Hello", "there")'],
  ['string', 'text (strings)', 2, 'Text goes inside quotes. + joins two pieces of text and * repeats one.', 'print("ha" * 3)'],
  ['number', 'numbers and sums', 3, 'Python does sums with + - * and /. // shares out whole things and % gives what is left over.', 'print(50 // 6, 50 % 6)'],
  ['variable', 'variables', 4, 'A variable is a name for a value. The value on the right goes into the name on the left.', 'score = 0'],
  ['input', 'input()', 5, 'input() asks a question and waits. Whatever is typed comes back as text.', 'name = input("What is your name? ")'],
  ['comment', 'comments', 5, 'A line that starts with # is a note for people. Python skips it.', '# get the input'],
  ['type-conversion', 'int(), float() and str()', 6, 'int() turns text into a whole number. str() turns a number into text.', 'age = int(input("Age? "))'],
  ['f-string', 'f-strings', 7, 'Put f before the quotes, then put values inside curly brackets.', 'print(f"Hello, {name}")'],
  ['boolean', 'True and False', 10, 'A comparison gives True or False. == asks "are these equal?".', 'print(3 > 2)'],
  ['if', 'if', 11, 'The indented lines only run when the condition is True.', 'if age >= 12:\n    print("Welcome")'],
  ['else', 'else', 12, 'else runs when the if did not.', 'else:\n    print("Not yet")'],
  ['elif', 'elif', 13, 'elif checks another condition, but only if the ones above were False.', 'elif age < 5:\n    print("Free")'],
  ['and-or-not', 'and, or, not', 14, 'and needs both to be True. or needs one. not flips it.', 'if tall and old_enough:'],
  ['string-methods', '.lower(), .strip(), .upper()', 15, 'Methods tidy up text. They give back a new piece of text.', 'answer = answer.strip().lower()'],
  ['random', 'random', 17, 'random.randint(1, 6) picks a whole number from 1 to 6.', 'roll = random.randint(1, 6)'],
  ['while', 'while loops', 20, 'A while loop repeats its indented lines for as long as the condition is True.', 'while count > 0:\n    count -= 1'],
  ['augmented-assign', '+= and friends', 21, 'total += 5 means "add 5 to total".', 'total += number'],
  ['break', 'break', 22, 'break jumps out of the loop straight away.', 'if guess == secret:\n    break'],
  ['for-loop', 'for loops', 24, 'A for loop runs once for each item. range(5) counts 0, 1, 2, 3, 4.', 'for i in range(5):\n    print(i)'],
  ['len', 'len()', 25, 'len() tells you how many letters or items there are.', 'print(len("hello"))'],
  ['function', 'functions', 30, 'def gives a name to a block of code so you can run it whenever you like.', 'def draw_line():\n    print("-" * 20)'],
  ['return', 'return', 32, 'return hands a value back to whoever called the function.', 'def area(w, h):\n    return w * h'],
  ['list', 'lists', 39, 'A list holds many values in order.', 'names = ["Asha", "Ben"]'],
  ['dictionary', 'dictionaries', 51, 'A dictionary looks things up by name instead of by position.', 'ages = {"Asha": 12}'],
  ['file', 'files', 62, 'with open() opens a file and closes it again for you.', 'with open("notes.txt", encoding="utf-8") as f:'],
];

export const MOCK_IDEAS: Idea[] = IDEA_ROWS.map(([key, label, lesson, reminder, example]) => ({
  key, label, lesson, reminder, example,
}));

function ideasFor(number: number): { taught: string[]; notYetTaught: string[] } {
  return {
    taught: MOCK_IDEAS.filter((i) => (i.lesson ?? 999) <= number).map((i) => i.key),
    notYetTaught: MOCK_IDEAS.filter((i) => (i.lesson ?? 999) > number).map((i) => i.key),
  };
}

// ---------------------------------------------------------------- the rich lesson

const RICH_STARTER = `# start the total
total = 0
count = 0

# add up three numbers
while count < 3:
    number = int(input("Number: "))
    total += number
    count += 1

# show the result
print("Total:", total)
`;

const RICH_SOLUTION = `# start the total
total = 0
count = 0

# keep adding until the user types 0
number = int(input("Number (0 to stop): "))
while number != 0:
    total += number
    count += 1
    number = int(input("Number (0 to stop): "))

# show the result
print("Total:", total)
print("You typed", count, "numbers")
`;

const RICH_GUIDE = `# Counting and totals

Lots of programs need to **keep score**. A game counts your guesses. A till adds up prices.
Both use the same two tricks.

## A counter

A counter is a variable that goes up by one each time something happens.

\`\`\`python
count = 0
count += 1
count += 1
print(count)
\`\`\`

\`count += 1\` is a short way to write \`count = count + 1\`.

## A running total

A running total goes up by a different amount each time.

\`\`\`python
total = 0
total += 4
total += 10
print(total)
\`\`\`

## The pattern

Every counting loop has the same three parts:

1. **Start** the total at zero, *before* the loop.
2. **Update** the total, *inside* the loop.
3. **Show** the result, *after* the loop.

> If the total always comes out as the last number typed, check the update line.
> It needs \`+=\`, not \`=\`.

| You write | It means |
|---|---|
| \`x += 1\` | add 1 to x |
| \`x -= 1\` | take 1 away from x |
| \`x *= 2\` | double x |
`;

const RICH_STEPS: Step[] = [
  {
    id: 'recall-1',
    kind: 'recall',
    title: 'Recall',
    bodyMarkdown: 'A quick question from the last lesson.',
    question: {
      kind: 'choice',
      prompt: 'When does a `while` loop stop?',
      options: [
        { id: 'a', text: 'When its condition becomes False', feedback: 'Yes. Python checks the condition before every turn of the loop.' },
        { id: 'b', text: 'After it has run ten times', feedback: 'Not quite. A while loop does not count for you.' },
        { id: 'c', text: 'When it reaches the last indented line', feedback: 'At the last indented line it goes back up and checks the condition again.' },
      ],
      correctId: 'a',
    },
  },
  {
    id: 'recall-2',
    kind: 'recall',
    title: 'Recall',
    bodyMarkdown: 'These lines make a countdown from 3, but they have been shuffled.',
    question: {
      kind: 'order',
      prompt: 'Put the lines in the right order.',
      lines: ['    count = count - 1', 'print("Lift off")', 'count = 3', 'while count > 0:', '    print(count)'],
      solution: [2, 3, 4, 0, 1],
    },
  },
  {
    id: 'predict',
    kind: 'predict',
    title: 'Predict',
    bodyMarkdown: 'Read the program in the editor. **Do not run it yet.**\n\nImagine you type `4`, then `5`, then `6`.',
    question: {
      kind: 'text',
      prompt: 'What does the last line print?',
      accept: ['Total: 15', '15'],
      caseSensitive: false,
      feedbackWrong: 'Follow `total` through the loop. It starts at 0 and each number typed is added to it.',
    },
  },
  {
    id: 'run',
    kind: 'run',
    title: 'Run',
    bodyMarkdown: 'Press **Run**. Type `4`, `5` and `6` when the program asks. Were you right?',
    question: { kind: 'none' },
  },
  {
    id: 'investigate-1',
    kind: 'investigate',
    title: 'Investigate',
    bodyMarkdown: 'Be the computer. Work through this shorter program one line at a time.',
    question: {
      kind: 'trace',
      prompt: 'Fill in what each variable holds after each line has run.',
      code: 'total = 0\ncount = 0\nwhile count < 2:\n    total += 10\n    count += 1',
      variables: ['total', 'count'],
      rows: [
        { line: 1, values: { total: '0' } },
        { line: 2, values: { total: '0', count: '0' } },
        { line: 4, values: { total: '10', count: '0' } },
        { line: 5, values: { total: '10', count: '1' } },
        { line: 4, values: { total: '20', count: '1' } },
        { line: 5, values: { total: '20', count: '2' } },
      ],
    },
  },
  {
    id: 'investigate-2',
    kind: 'investigate',
    title: 'Investigate',
    bodyMarkdown: 'This version always prints the last number typed instead of the total.',
    question: {
      kind: 'spot',
      prompt: 'Click the line that has the bug.',
      code: 'total = 0\ncount = 0\nwhile count < 3:\n    number = int(input("Number: "))\n    total = number\n    count += 1\nprint("Total:", total)',
      faultyLines: [5],
      feedback: 'Line 5 throws the old total away. It needs to add to it.',
    },
  },
  {
    id: 'modify',
    kind: 'modify',
    title: 'Modify',
    bodyMarkdown: 'Change the program so that it asks for **five** numbers instead of three.',
    question: { kind: 'code', prompt: 'Make the change, then press Check.' },
    checkId: 'modify',
  },
  {
    id: 'make',
    kind: 'make',
    title: 'Make',
    bodyMarkdown:
      'Write a program that keeps asking for numbers until the user types `0`.\n\n- Then print the total.\n- Then print how many numbers were typed (do not count the 0).',
    question: { kind: 'code', prompt: 'Write your program, then press Check.' },
    checkId: 'make',
  },
];

// ---------------------------------------------------------------- generic lessons

function genericSteps(summary: LessonSummary): Step[] {
  const terminal = summary.number === 83 || summary.number === 88;
  const finalStep: Step = terminal
    ? {
        id: 'make',
        kind: 'make',
        title: 'Make',
        bodyMarkdown: 'Open the terminal panel and type the commands for this task.',
        question: { kind: 'terminal', prompt: 'Run `git status` in the terminal, then press Check.' },
        checkId: 'make',
      }
    : {
        id: 'make',
        kind: 'make',
        title: 'Make',
        bodyMarkdown: `Write a short program of your own that uses today's idea.\n\n- It must run without an error.\n- It must print at least two lines.`,
        question: { kind: 'code', prompt: 'Write your program, then press Check.' },
        checkId: 'make',
      };

  if (summary.type !== 'learn') {
    return [
      {
        id: 'intro',
        kind: 'info',
        title: 'Before you start',
        bodyMarkdown: `**${summary.title}** is a ${summary.type} lesson. Read the guide, then have a go.`,
        question: { kind: 'none' },
      },
      finalStep,
    ];
  }

  const steps: Step[] = [];
  if (summary.number > 1) {
    steps.push({
      id: 'recall',
      kind: 'recall',
      title: 'Recall',
      bodyMarkdown: 'A quick question from an earlier lesson.',
      question: {
        kind: 'choice',
        prompt: 'Which of these shows text on the screen?',
        options: [
          { id: 'a', text: 'print("Hi")', feedback: 'Yes.' },
          { id: 'b', text: 'show("Hi")', feedback: 'Python has no instruction called show.' },
          { id: 'c', text: 'input("Hi")', feedback: 'input() asks a question and waits for an answer.' },
        ],
        correctId: 'a',
      },
    });
  }
  steps.push(
    {
      id: 'predict',
      kind: 'predict',
      title: 'Predict',
      bodyMarkdown: 'Read the code in the editor. **Do not run it yet.**',
      question: {
        kind: 'choice',
        prompt: 'How many lines will this program print?',
        options: [
          { id: 'a', text: 'One', feedback: 'Count the print lines again.' },
          { id: 'b', text: 'Two', feedback: 'Yes. Each print makes one line.' },
          { id: 'c', text: 'None', feedback: 'There are two print lines, and each one shows something.' },
        ],
        correctId: 'b',
      },
    },
    {
      id: 'run',
      kind: 'run',
      title: 'Run',
      bodyMarkdown: 'Press **Run** and look at the console. Were you right?',
      question: { kind: 'none' },
    },
    {
      id: 'investigate',
      kind: 'investigate',
      title: 'Investigate',
      bodyMarkdown: 'Look closely at the first line of the program.',
      question: {
        kind: 'text',
        prompt: 'Which word tells Python to show something on the screen?',
        accept: ['print', 'print()'],
        feedbackWrong: 'It is the word just before the first bracket.',
      },
    },
    {
      id: 'modify',
      kind: 'modify',
      title: 'Modify',
      bodyMarkdown: 'Change the program so that it prints a third line.',
      question: { kind: 'code', prompt: 'Make the change, then press Check.' },
      checkId: 'modify',
    },
    finalStep,
  );
  return steps;
}

function genericFiles(summary: LessonSummary): { starter: CodeFile[]; data: string[] } {
  if (summary.number === 62) {
    return {
      starter: [{ name: 'starter.py', content: 'with open("shopping.txt", encoding="utf-8") as file:\n    for line in file:\n        print(line.strip())\n' }],
      data: ['shopping.txt', 'prices.csv'],
    };
  }
  if (summary.number === 71) {
    return {
      starter: [
        { name: 'main.py', content: 'from helpers import draw_line, show_title\n\nshow_title("The Arcade")\ndraw_line()\nprint("1. Guess the Number")\nprint("2. Dice")\n' },
        { name: 'helpers.py', content: 'def draw_line():\n    print("-" * 24)\n\n\ndef show_title(text):\n    draw_line()\n    print(text.upper())\n' },
      ],
      data: [],
    };
  }
  if (summary.number === 85) {
    return {
      starter: [
        { name: 'todo.py', content: 'def add_task(tasks, text):\n    tasks.append(text)\n    return tasks\n\n\ndef count_tasks(tasks):\n    return len(tasks)\n' },
        { name: 'test_todo.py', content: 'from todo import add_task, count_tasks\n\n\ndef test_add_task():\n    assert add_task([], "feed the cat") == ["feed the cat"]\n\n\ndef test_empty_list():\n    assert count_tasks([]) == 0\n' },
      ],
      data: [],
    };
  }
  return {
    starter: [{ name: 'starter.py', content: `# ${summary.title}\nprint("Hello")\nprint("This is lesson", ${summary.number})\n` }],
    data: [],
  };
}

export const MOCK_DATA_FILES: Record<string, string> = {
  'shopping.txt': 'apples\nbread\ncheese\noat milk\ntomatoes\n',
  'prices.csv': 'item,price\napples,1.20\nbread,0.95\ncheese,2.40\noat milk,1.10\ntomatoes,0.80\n',
};

export function buildMockLesson(summary: LessonSummary): Lesson {
  const ideas = ideasFor(summary.number);
  if (summary.id === RICH_LESSON_ID) {
    return {
      ...summary,
      guideMarkdown: RICH_GUIDE,
      steps: RICH_STEPS,
      starterFiles: [{ name: 'starter.py', content: RICH_STARTER }],
      dataFiles: [],
      ...ideas,
    };
  }
  const files = genericFiles(summary);
  return {
    ...summary,
    guideMarkdown:
      `# ${summary.title}\n\nThis is stand-in text from the mock bridge.\n\n**New idea:** ${summary.newIdea}.\n\n` +
      '```python\nprint("Hello")\n```\n\nRead the steps below and work through them in order.\n',
    steps: genericSteps(summary),
    starterFiles: files.starter,
    dataFiles: files.data,
    ...ideas,
  };
}

export function buildMockSolution(summary: LessonSummary): CodeFile[] {
  if (summary.id === RICH_LESSON_ID) return [{ name: 'solution.py', content: RICH_SOLUTION }];
  return [{ name: 'solution.py', content: `# A model answer for "${summary.title}"\nprint("Line one")\nprint("Line two")\nprint("Line three")\n` }];
}

// ---------------------------------------------------------------- progress

/** A learner part-way through the course: stages 1 and 2 done, working through stage 3. */
export function buildMockProgress(): Record<string, LessonProgress> {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const out: Record<string, LessonProgress> = {};
  for (const lesson of MOCK_LESSONS) {
    if (lesson.number <= 20) {
      out[lesson.id] = {
        ...emptyProgress(lesson.id),
        started: true,
        passed: lesson.number !== 18,
        stepsDone: lesson.number === 18 ? ['intro'] : buildMockLesson(lesson).steps.map((s) => s.id),
        attempts: 1 + (lesson.number % 3),
        hintsUsed: { small: lesson.number % 2, big: lesson.number % 5 === 0 ? 1 : 0, answer: lesson.number === 13 ? 1 : 0 },
        secondsSpent: 600 + lesson.number * 45,
        lastOpened: now - (22 - lesson.number) * day,
        bookmarked: lesson.number === 7 || lesson.number === 17,
        notes: lesson.number === 7 ? 'Remember: f before the quotes, curly brackets round the value.' : '',
      };
    }
  }
  out[RICH_LESSON_ID] = {
    ...emptyProgress(RICH_LESSON_ID),
    started: true,
    stepsDone: ['recall-1', 'recall-2', 'predict'],
    attempts: 1,
    hintsUsed: { small: 1, big: 0, answer: 0 },
    secondsSpent: 420,
    lastOpened: now - 60 * 1000,
    code: { 'starter.py': RICH_STARTER },
    bookmarked: true,
  };
  return out;
}

// ---------------------------------------------------------------- AI

export const MOCK_CATALOGUE: ModelEntry[] = [
  {
    id: 'tutor-small',
    name: 'Small tutor',
    tier: 'small',
    minVramMb: 0,
    fileName: 'tutor-small-q4.gguf',
    url: 'https://models.example.invalid/tutor-small-q4.gguf',
    sizeBytes: 1_100_000_000,
    sha256: '0'.repeat(64),
    licence: 'Apache-2.0',
    contextSize: 4096,
  },
  {
    id: 'tutor-medium',
    name: 'Medium tutor',
    tier: 'medium',
    minVramMb: 6000,
    fileName: 'tutor-medium-q4.gguf',
    url: 'https://models.example.invalid/tutor-medium-q4.gguf',
    sizeBytes: 4_400_000_000,
    sha256: '1'.repeat(64),
    licence: 'Apache-2.0',
    contextSize: 8192,
  },
  {
    id: 'tutor-large',
    name: 'Large tutor',
    tier: 'large',
    minVramMb: 11000,
    fileName: 'tutor-large-q4.gguf',
    url: 'https://models.example.invalid/tutor-large-q4.gguf',
    sizeBytes: 8_600_000_000,
    sha256: '2'.repeat(64),
    licence: 'MIT',
    contextSize: 8192,
  },
];

export const MOCK_HARDWARE: HardwareInfo = {
  gpus: [{ name: 'Example graphics card (8 GB)', vramMb: 8192, vendor: 'example' }],
  ramMb: 16384,
  cpu: 'Example six-core processor',
  recommendedTier: 'medium',
};

export const MOCK_TUTOR_LINES = [
  'You have started the total at zero. Good place for it: before the loop.',
  'Look at the line inside the loop that changes `total`. Does it add to the old value or replace it?',
  'Your loop needs something that changes each time round, or it will never stop.',
  'The condition on your `while` line decides when the loop ends. Read it out loud with the numbers you typed.',
  'Check the indentation under `while`. Only the indented lines repeat.',
];
