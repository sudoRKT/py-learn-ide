# py-learn-ide: 100-lesson plan

Draft for approval, 11 October 2026. Independent reviewers have checked it three times for lessons that use something before it is taught, most recently after the rework for the offline and no-brands rules. Their corrections are built in. No lesson gets written until this is signed off.

## The short version

- 100 lessons in eleven stages. Every stage except the Git one ends with a project. Stages are 5 to 12 lessons long.
- The order is: printing and variables, decisions, loops, functions (named, reusable chunks of code), lists, dictionaries (lookup tables), files and errors, classes (your own kinds of data), real-world tools, Git and GitHub, then reading and fixing other people's code.
- Lessons 1 to 38 cover the basics up to and including functions.
- 16 lessons are builds: nine games, three tools and a four-lesson finale. The finale is the learner's choice of three: a data tool, a game or a file organiser.
- Three programs grow the furthest. A to-do list comes back in five versions (lessons 41, 56, 65, 76 and 85). Rock, Paper, Scissors goes from one round to a full game to part of an arcade. A two-room text adventure in lesson 16 becomes a full game in lesson 78.
- Nothing in the lessons is branded or copyrighted. Every name, story and dataset is invented.
- No lesson needs the internet except the two GitHub lessons (91 and 92).
- At the target lengths below, the course adds up to between 30 and 60 hours. Expect a first-timer to land at the top of that range or past it.

## How every lesson works

Learn lessons follow six steps:

1. **Recall.** Two or three quick questions from earlier lessons, mixed up.
2. **Predict.** Working code is already in the editor. You say what it will print before the Run button unlocks.
3. **Run.** See whether you were right.
4. **Investigate.** Questions about that code: what is `x` after line 3, which line decides who wins.
5. **Modify.** Change the working code to do something slightly different.
6. **Make.** Write your own from a short brief. Automatic checks decide when it is done, and passing earns the lesson its tick.

Steps 2 to 6 are a classroom method called PRIMM (Predict, Run, Investigate, Modify, Make). It comes from a study of about 500 pupils aged 11 to 14 who had 8 to 12 weeks of lessons taught this way by teachers, and their results improved. It has not been tested on people learning alone, which is how this app uses it. The recall step is this plan's addition.

Early stages spend most of their time on steps 2 to 5. Later stages shrink them, and by stage 9 a lesson is mostly Make. Hand-holding helps beginners and slows people down once they know more.

Rules for every lesson:

- Nothing branded or copyrighted. Every name, story and dataset is invented.
- No lesson needs the internet, except the two GitHub lessons (91 and 92).
- Wording and examples are pitched at anyone from 11 up.
- Any lesson can be opened at any time. The suggested order is shown, and passing a lesson earns its tick.
- A lesson that continues earlier work starts from a supplied copy of it, so it can be opened on its own. The four finale lessons share one folder.
- One main idea per Learn lesson. Small tools that belong with it ride along.
- Starter code, checks and hints only use ideas already taught. Each lesson carries a "not taught yet" list, and the tutor is given it. Lessons 49 and 94 are the planned exceptions: their whole point is using or recognising things the course hasn't taught.
- The first time an idea appears, it comes as a worked example with each group of lines labelled by what it is for ("get the input", "update the total"). The same labels are reused in later lessons.
- Hints unlock only after you have tried something.
- Small hint and big hint never contain the solution. Give answer is a separate, deliberate button, and using it sends that idea back into later recall questions.

Lesson types in the tables below:

| Type | What it is | Target length |
|---|---|---|
| Learn | One new idea in six steps | 15 to 25 minutes |
| Skill | A way of working: planning, looking things up, designing | 20 to 30 minutes |
| Fix | Broken programs to repair | 20 to 30 minutes |
| Read | Code you didn't write, to trace and answer questions about | 20 to 30 minutes |
| Build | A project. A required core that is checked, plus optional "make it yours" extras | 30 to 90 minutes |

## The 100 lessons

### Stage 1: First programs (1 to 9)

By the end you can write a program that asks questions and uses the answers.

| # | Lesson | Type | New idea | You make |
|---|---|---|---|---|
| 1 | Hello, world | Learn | `print()`, printing several things at once, running a program, the main panels | Three lines of your own on screen |
| 2 | Text | Learn | Strings, quotes, joining with `+`, repeating with `*`, `\n` for a new line | A name badge made of text |
| 3 | Numbers | Learn | Whole and decimal numbers, `+ - * /`, `//` and `%` for sharing and remainders, brackets | 50 sweets shared among 6 friends, then the minutes in a week |
| 4 | Variables | Learn | Naming a value, names that explain themselves, `=` works right to left, changing a value | A score that starts at 0 and goes up three times |
| 5 | Asking questions | Learn | `input()`, `#` comments to label the steps | A greeter that asks your name and favourite food |
| 6 | Text is not a number | Learn | `str`, `int`, `float`, converting, why `"5" + 5` fails | Ask for a birth year and print the age in 2040 |
| 7 | f-strings | Learn | Values inside text, two decimal places, lining up columns | A bill splitter that prints a tidy receipt |
| 8 | Fix it: your first error messages | Fix | Reading `SyntaxError`, `NameError` and `TypeError`, line numbers, unclosed quotes and brackets | Five broken programs repaired |
| 9 | Project: Fill-in story | Build | Everything so far | Ask for six words and drop them into a three-part story |

### Stage 2: Decisions (10 to 19)

By the end your programs react differently to different answers.

| # | Lesson | Type | New idea | You make |
|---|---|---|---|---|
| 10 | True and False | Learn | Booleans, `== != < > <= >=`, `=` versus `==` | Ask for two numbers and print five true-or-false facts about them |
| 11 | if | Learn | `if`, the colon, indentation makes a block | A secret-word check |
| 12 | if and else | Learn | Two branches, exactly one runs | Odd or even |
| 13 | elif | Learn | Chains of choices, order matters | Ticket price by age |
| 14 | and, or, not | Learn | Combining conditions | A ride checker: tall enough and old enough |
| 15 | Tidying what people type | Learn | Methods: `.lower()`, `.strip()`, `.upper()` | A yes/no question that accepts "YES", " yes " and "y" |
| 16 | Decisions inside decisions | Learn | Nested `if` | A two-room text adventure with four endings |
| 17 | Luck | Learn | `import random`, `random.randint()` | A dice roller that comments on your roll |
| 18 | Fix it: colons, indents and logic | Fix | `IndentationError`, missing colons, branches in the wrong order | Five broken programs repaired |
| 19 | Project: Rock, Paper, Scissors | Build | Everything so far | One round against the computer |

### Stage 3: Loops (20 to 29)

By the end you can write games that keep going until someone wins.

| # | Lesson | Type | New idea | You make |
|---|---|---|---|---|
| 20 | while | Learn | Repeat while a condition is true, the Stop button, loops that never end | A rocket countdown |
| 21 | Counting and totals | Learn | `+=`, counters, running totals | Add up numbers until the user types 0 |
| 22 | Loops that check input | Learn | `while True`, `break`, `.isdigit()` | Keep asking until you get a number from 1 to 10, even if someone types "abc" |
| 23 | Mini-build: Guess the Number | Build | Stage 3 so far | A higher/lower game that counts your guesses |
| 24 | for and range | Learn | `for`, `range()` with start, stop and step, why it stops one short | Any times table |
| 25 | Looping over text | Learn | One letter at a time, `len()`, `in`, building a new string | Count the vowels in a sentence, then print it with the vowels removed |
| 26 | Loops inside loops | Learn | Nested loops, `end=""` to stay on one line | A multiplication grid |
| 27 | Be the computer | Read | Tracing a loop by hand with a variable table | Four programs traced, one off-by-one bug fixed |
| 28 | Plan before you type | Skill | Putting the steps in order in plain English, then writing code under each | FizzBuzz, planned then built |
| 29 | Project: Rock, Paper, Scissors, full game | Build | Everything so far | Best of five with a score and "play again?" |

### Stage 4: Functions (30 to 38)

By the end your programs are built from small named parts.

| # | Lesson | Type | New idea | You make |
|---|---|---|---|---|
| 30 | Your own commands | Learn | `def`, calling a function, a first line that says what it does | `draw_line()` and `show_title()` used in a menu |
| 31 | Parameters | Learn | Passing values in | `greet(name)` and `draw_box(width, height)` |
| 32 | Return | Learn | Handing a value back, `return` versus `print`, `return` ends the function, no `return` gives `None` | `area(width, height)` used inside a paint calculator |
| 33 | Yes-or-no functions | Learn | Returning `True` or `False`, using a function in an `if` | `is_valid_age()` and `is_even()` |
| 34 | Default and named arguments | Learn | Default values, calling by name | `greet(name, greeting="Hello")` |
| 35 | Where variables live | Learn | Local and global, pass in and return out | A program that leans on global variables, fixed |
| 36 | Functions calling functions | Learn | Breaking one job into small ones, `main()` | Guess the Number rebuilt as four functions |
| 37 | Fix it: bugs with no error message | Fix | Print-debugging, stepping through line by line, watching variables | Three logic bugs found and fixed |
| 38 | Project: The Arcade | Build | Everything so far | One menu, three games, shared helper functions |

### Stage 5: Lists and text (39 to 50)

By the end you can hold and work with many things at once.

| # | Lesson | Type | New idea | You make |
|---|---|---|---|---|
| 39 | Lists | Learn | Creating, indexes from 0 on lists and strings, negative indexes, `len()`, `IndexError` | A top-five list: first, last and how many |
| 40 | Looping over lists | Learn | `for item in list`, `in` to check what is there, an empty list counts as false | A shopping list printed with numbers, and whether milk is on it |
| 41 | Changing lists | Learn | `append`, `insert`, `remove`, `pop` | To-do list v1: add, show and remove (the menu is supplied) |
| 42 | Ready-made tools for lists | Learn | `sum`, `min`, `max`, `sorted` and `.sort()`, `reverse=True`, `random.choice`, `random.shuffle` | Scores: total, average, best and a sorted leaderboard |
| 43 | Slices | Learn | `[a:b]` on lists and strings, copying a list | The top three scores, a username from the first three letters of a name |
| 44 | Tuples and unpacking | Learn | Fixed groups of values, `a, b = ...`, returning two values, `enumerate` | A function that returns the lowest and highest score, a numbered leaderboard |
| 45 | Splitting and joining text | Learn | `.split()`, `.join()`, `.replace()`, strings cannot be changed in place | An acronym maker |
| 46 | Mini-build: Hangman | Build | Stage 5 so far | Guess the word letter by letter with six lives (the drawing is supplied) |
| 47 | Two names, one list | Learn | `b = a` does not copy, a function can change the list you hand it | Five programs predicted, one bug fixed |
| 48 | Lists of lists | Learn | Grids, `grid[row][col]` | A 3 by 3 board printed with a mark placed on it |
| 49 | How to look things up | Skill | `help()`, `dir()`, Python's built-in help pages, small experiments | Three tasks solved with methods this course never taught |
| 50 | Project: Tic-Tac-Toe | Build | Everything so far | Two players, with win and draw detection |

### Stage 6: Dictionaries and data (51 to 61)

By the end you can model real information: records, counts and lookups.

| # | Lesson | Type | New idea | You make |
|---|---|---|---|---|
| 51 | Dictionaries | Learn | Key and value, look up, add, change, `KeyError` | A phone book |
| 52 | Looping over dictionaries | Learn | `.items()`, `.keys()`, `.values()` | A price list and its total |
| 53 | When something is missing | Learn | `.get()`, `None`, `is None` | A lookup that says "not found" instead of crashing |
| 54 | Counting with dictionaries | Learn | The tally pattern | Count each letter in a sentence |
| 55 | Sorting by a key | Learn | Handing a function to `sorted()`, `lambda` | The ten most common words in a text (the text is supplied) |
| 56 | Records | Learn | A list of dictionaries, filtering | To-do list v2: tasks with a priority and a done flag (most of it supplied) |
| 57 | Sets | Learn | Unique items, in A but not B, in both | Two guest lists compared: who is new, who dropped out |
| 58 | Comprehensions | Learn | A loop on one line, reading and writing them | Three loops rewritten as comprehensions and three back |
| 59 | Data inside data | Learn | Dictionaries holding lists holding dictionaries | Six values pulled out of a nested game save |
| 60 | Fix it: data bugs | Fix | `KeyError`, `IndexError`, `"1"` versus `1`, changing a list while looping over it | Five broken programs repaired |
| 61 | Project: Quiz game | Build | Everything so far | Shuffled questions, a score per category, a results table |

### Stage 7: Files and errors (62 to 70)

By the end your programs remember things between runs and survive bad input.

| # | Lesson | Type | New idea | You make |
|---|---|---|---|---|
| 62 | Reading files | Learn | `with open()`, reading lines, `encoding="utf-8"` | A numbered list printed from a text file |
| 63 | Writing files | Learn | Write and append modes, data that survives a restart | A guest book |
| 64 | When things go wrong | Learn | `try` and `except`, catching the right error (`ValueError`, `FileNotFoundError`), `as e` | Number input that survives "abc", a friendly "file not found" |
| 65 | Saving data with JSON | Learn | `json.dump()`, `json.load()` | To-do list v3: remembers tasks between runs (you write save and load) |
| 66 | CSV files | Learn | `csv.DictReader` and `csv.DictWriter`, rows as dictionaries, numbers arrive as text, `newline=""` | Five questions answered from a CSV of made-up sports results, then the top ten written to a new file |
| 67 | Dates and times | Learn | `from ... import ...`, `datetime`: today's date, the gap between two dates, dates as text | `days_until(birthday, today)` and a date-stamped filename |
| 68 | Files and folders | Learn | `pathlib`: building paths, checking a file exists, listing a folder, a file's type and size, making a folder, moving a file | Every file in a folder listed with its type and size, then the text files moved into a folder of their own |
| 69 | Fix it: reading tracebacks | Fix | Reading a long traceback from the bottom up, finding your own line, `AttributeError` | Five programs that crash on bad files and bad data, repaired |
| 70 | Project: Report maker | Build | Everything so far | A sales CSV turned into a summary report and a totals CSV |

### Stage 8: Classes and bigger programs (71 to 78)

By the end you can organise a program across several files.

| # | Lesson | Type | New idea | You make |
|---|---|---|---|---|
| 71 | Your own modules | Learn | Code in two files, importing your own functions, `if __name__ == "__main__":` | The Arcade's helpers moved into their own file (the Arcade is supplied) |
| 72 | Classes and objects | Learn | A class as a blueprint, `__init__`, `self`, attributes | A `Player` with a name and a score |
| 73 | Methods | Learn | Functions that belong to an object and change its data, `raise` for refusing bad values | `BankAccount` with `deposit()` and a `withdraw()` that refuses to go overdrawn |
| 74 | Many objects | Learn | `__str__`, lists of objects, sorting them by an attribute, one object holding others | A leaderboard of players |
| 75 | Type hints | Learn | `name: str`, `-> int`, `list[str]`, what hints do and don't do | Hints added to five functions, two wrong hints spotted |
| 76 | Dataclasses | Learn | `@dataclass` for classes that mostly hold data, what a line starting with `@` means, `asdict()` | To-do list v4: tasks as dataclasses, still saving to JSON |
| 77 | Designing a program | Skill | From idea to plan: the data, the actions, the files, the smallest working version, `pass` for parts not written yet | The skeleton of the Adventure game: files, classes and empty functions |
| 78 | Project: Adventure game | Build | Everything so far | Rooms, items and a player as classes, the map loaded from a JSON file, save and load |

### Stage 9: Python in the real world (79 to 87)

By the end you can write the kind of script that does a real job. The fetching lessons run against the practice service built into the app, so no internet is needed.

| # | Lesson | Type | New idea | You make |
|---|---|---|---|---|
| 79 | Asking a service | Learn | What an API is, `requests` (an add-on package that ships with the app), `requests.get()` with `params`, `.json()` and `.text` | Today's temperature at a weather station on a made-up island |
| 80 | Digging through JSON | Learn | Finding what you need in a big response | Six facts pulled out of a big response |
| 81 | When the service lets you down | Learn | Status codes, timeouts, `raise_for_status()`, catching the errors | The temperature program made to fail politely when the service is switched off |
| 82 | Settings and secrets | Learn | Constants at the top, environment variables, why keys never go in code | A program with a key pasted into it, cleaned up |
| 83 | Command-line programs | Learn | `argparse`: arguments and optional flags, `--help`, running `python file.py` in the terminal panel | A converter between made-up currencies that gets its rates from the practice service, run as `python convert.py 100 ZED KAY` |
| 84 | Logging | Learn | `logging` levels instead of scattered `print()` | A log added to the converter |
| 85 | Your first tests | Learn | `pytest`, `assert`, `pytest.raises` | To-do list v5: six tests for its functions |
| 86 | Testing code that uses a service | Learn | Splitting the fetching from the working-out, testing with a saved response | Tests for the weather code that pass with the service switched off |
| 87 | Project: Weather logger | Build | Everything so far | Fetch a station's readings, add them to a CSV log, draw a text chart, with tests |

### Stage 10: Git and GitHub (88 to 92)

By the end your work has a history you can rewind, and you can read and publish projects on GitHub. Lessons 91 and 92 are the only two in the course that use the internet.

| # | Lesson | Type | New idea | You make |
|---|---|---|---|---|
| 88 | Git: saving snapshots | Learn | What version control is, `git init`, `status`, `add`, `commit`, `log` | The Arcade put under Git with three snapshots |
| 89 | Git: looking back and undoing | Learn | `git diff`, `git restore`, going back to an earlier snapshot, `.gitignore` | A bad change spotted with `diff` and undone |
| 90 | Git: branches | Learn | `git branch`, `switch`, `merge`: a safe place to try something | A new game mode built on a branch, then merged |
| 91 | GitHub: finding your way round a project | Read | What GitHub is, a project's page, the README, `requirements.txt` and `pip`, the tests folder, `git clone`, `cd` to move into a folder | The app's own sample project cloned and toured: where each job happens |
| 92 | GitHub: your own project online | Learn | An account, a new repository, signing in from the terminal, `git remote`, `git push`, `git pull` | Your Adventure game published (optional) |

### Stage 11: Other people's code (93 to 100)

By the end you can read, fix and extend code you have never seen, and build a real project from nothing.

| # | Lesson | Type | New idea | You make |
|---|---|---|---|---|
| 93 | Reading code you didn't write | Read | Find the entry point, follow one feature, ignore the rest | Ten questions answered about a three-file program |
| 94 | Things you will meet | Read | Recognising what this course didn't teach: `*args` and `**kwargs`, `@` decorators, inheritance, regular expressions, `%` and `.format()`, `os.path`, virtual environments | Each one spotted in a sample program and matched to what it does |
| 95 | Fix it: someone else's bug | Fix | Using failing tests and a traceback to find a bug in unfamiliar code | Four failing tests made to pass, the fix saved as a commit |
| 96 | Mini-build: Add a feature | Build | Changing code without breaking it, writing the test first | A new menu option added to a program you didn't write, built on a branch |
| 97 | Finale 1: plan and skeleton | Build | Everything so far | Your chosen project planned as files and empty functions, saved as a first commit |
| 98 | Finale 2: the core | Build | Everything so far | The main job working from start to finish, committed |
| 99 | Finale 3: finishing it | Build | Everything so far | The remaining features, error handling and a log, committed |
| 100 | Finale 4: tests and finish | Build | Everything so far | Tests for the core, a README and a final commit |

## The projects

Seven of the 16 builds come straight from projects that beginner books and courses recommend, limited to those that run in a text console. Two (Report maker and Weather logger) are modelled on recommended projects and seven are our own designs. Arcade games that need a graphics window are on most beginner project lists and are left out for that reason. Every name, story and dataset used in the projects is invented.

| Lesson | Project | Kind | Recommended by |
|---|---|---|---|
| 9 | Fill-in story | Game | freeCodeCamp |
| 19, 29 | Rock, Paper, Scissors | Game | Big Book of Small Python Projects, freeCodeCamp, Real Python, JetBrains Academy |
| 23 | Guess the Number | Game | Big Book, Invent Your Own Computer Games, freeCodeCamp |
| 38 | The Arcade | Game | Own design: ties the first three games together |
| 46 | Hangman | Game | Big Book, Invent Your Own Computer Games, freeCodeCamp, JetBrains Academy |
| 50 | Tic-Tac-Toe | Game | Big Book, Invent Your Own Computer Games, freeCodeCamp, JetBrains Academy, Real Python |
| 61 | Quiz game | Game | Big Book, Real Python |
| 70 | Report maker | Tool | Modelled on the CSV projects in Automate the Boring Stuff |
| 78 | Adventure game | Game | Own design: grows out of lesson 16 |
| 87 | Weather logger | Tool | freeCodeCamp (weather program), reworked to use the practice service |
| 96 | Add a feature | Tool | Own design |
| 97 to 100 | The finale | Learner's choice | Own designs. The finish line (a README plus tests) follows what CS50P asks of its final project |

Two smaller builds inside Learn lessons also come from those lists: a word counter (lesson 55; Exercism, Real Python) and a currency converter (lesson 83).

### The finale

The last four lessons are one project, and the learner picks which. All three follow the same four steps: plan and skeleton, the core, finishing it, tests and finish. Each step ends with a commit.

| Finale | Kind | What it does | Leans on |
|---|---|---|---|
| Register Watch | Data tool | Fetches a list from the practice service, saves a dated snapshot, finds what was added, removed or changed since the last one and writes a report | Sets, CSV, dates, the practice service |
| Treasure Hunt | Game | A grid game with levels loaded from files, items to collect and a saved high-score table | Lists of lists, classes, JSON |
| Tidy-Up | File organiser | Sorts a messy folder into subfolders by type, with a practice mode that only shows what would move, a log and an undo | Files and folders, dates, command-line arguments, logging |

### The to-do list thread

One program is rebuilt each time a big idea arrives. The point is to feel the problem before meeting the fix: v1 forgets everything when you close it, which is exactly why v3 exists. Each version arrives as starter code and you change only the part the new idea affects.

| Version | Lesson | What changes |
|---|---|---|
| v1 | 41 | Tasks in a list: add, show, remove |
| v2 | 56 | Each task becomes a record with a priority and a done flag |
| v3 | 65 | Saved to a JSON file, so it remembers |
| v4 | 76 | Tasks become dataclasses |
| v5 | 85 | Covered by tests |

### The practice service

Stage 9 teaches how programs fetch data from a service, which is how most real scripts get their information. Those lessons never touch the internet. The app runs a small made-up service on the computer itself, and the lessons talk to that. It serves invented data: weather stations on a made-up island, exchange rates between made-up currencies and a register of made-up clubs. It can be told to go slow, fail or ask for a key, so the lessons on errors and secrets have something real to practise on.

### The two online lessons

Lessons 91 and 92 are the only ones that use the internet. Lesson 91 clones the app's own sample project from GitHub and falls back to a copy inside the app when there is no connection. Lesson 92 needs a GitHub account, and GitHub's terms require users to be at least 13, so it is marked optional and the course can be finished without it.

## How lessons plug into the IDE

Each lesson is a small folder of plain files inside the app. The app reads the folders when it starts. Nothing about a lesson is hard-wired into the program, so a lesson can be fixed or added without rebuilding the app.

```
lessons/
  index.json          the 100 lessons in order, with stage and title
  016-nested-if/
    lesson.json       title, type, the new idea, what has and hasn't been taught yet
    guide.md          the text shown in the left sidebar
    steps.json        the steps in order, with their questions
    starter.py        what the editor opens with
    solution.py       a model answer
    checks.py         the automatic checks for the Make step
    hints.json        the small hint and the big hint, written by hand
    tutor.json        this lesson's common mistakes, each with what the tutor should say
    files/            any data the lesson needs: CSVs, saved responses
```

What each part of the screen takes from the folder:

| Part of the app | Reads |
|---|---|
| Left sidebar | `guide.md` and `steps.json` |
| Editor | `starter.py` |
| The lesson's tick | `checks.py` |
| Small hint and big hint buttons | `hints.json` |
| Give answer button | `solution.py` |
| Live tutor | `tutor.json` and the "not taught yet" list in `lesson.json` |

The hints and common mistakes are written by hand for each lesson and handed to the AI behind the tutor. Its job is to match what the learner actually typed to one of them and explain it in plain words. The aim is to make wrong feedback less likely, including on the smallest AI model the tutor can run on. That has not been tested yet. In one classroom trial (in maths, with a far larger AI), a tutor given teacher-written hints and a list of common mistakes did no harm to later test scores, while a plain chatbot lowered them by 17%.

Finale lessons hold one set of these files per project. Git lessons start from a supplied folder and are checked by looking at its saved snapshots and settings.

Every lesson has to pass three automatic tests before it ships: the model answer passes the checks, the starter code fails them, and nothing in the lesson uses an idea taught later (lessons 49 and 94 excepted).

## What this changes in the app

1. **Tutor timing.** Slips like a missing bracket get an instant underline with no AI involved. The tutor itself stays quiet while you type, speaks after about 2 seconds idle, and speaks straight away when a run fails. It leaves at least 10 seconds between comments to begin with. A slider changes how often it speaks, including off. One study found people got annoyed by frequent comments, which is why the slider is there.
2. **A question box.** The learner can type a question to the tutor. It answers about the current lesson and code only, steers anything else back to the lesson, and follows the same no-answers rule as the hints.
3. **Open menu.** Any lesson can be opened at any time. The suggested order is shown and passing a lesson earns its tick.
4. **Console.** Output appears as it happens, `input()` works, and there is a Stop button. Beginners write endless loops by accident from lesson 20.
5. **Run one line at a time, with a table of variables.** A button that runs the program one line at a time and a panel showing what each variable holds after every line. Needed for lessons 27 and 37.
6. **Step types.** Predict (Run stays locked until you answer), multiple choice, put the lines in order, fill in a variable table, click the faulty line, and write code.
7. **The checker.** It runs the learner's code with scripted answers typed in. It matches output loosely in the early lessons and tests named functions from lesson 30. It fixes the dice rolls and the date so results repeat. It runs a learner's own tests against one correct program and several broken ones, to prove the tests catch bugs. For the Git lessons it inspects the saved snapshots. Each lesson runs in its own scratch folder that can be reset.
8. **The practice service.** A made-up data service that runs on the computer itself, used from lesson 79, with switches to make it slow, fail or ask for a key. It never sends anything off the computer.
9. **Several files open at once, and a viewer for data files.** Data files from lesson 62, several code files from lesson 71.
10. **A "settings for this run" box.** For lesson 82.
11. **A terminal panel.** For running programs with arguments from lesson 83 and for Git from lesson 88. It opens in the lesson's own folder, and Git comes set up with a learner name so the first commit works.
12. **A test panel.** Shows which tests pass and fail, from lesson 85.
13. **Bundled software.** `requests`, `pytest` and Git are not part of Python itself, so they ship inside the installer.
14. **Cloud AI.** Using a cloud model with your own key is a normal choice in the model picker. It is the one feature that sends code off the computer, it stays off until someone adds a key, and it carries a warning about speed, cost and code leaving the computer.

## How the order was chosen

Thirteen courses were compared for the order they teach in: Automate the Boring Stuff (3rd edition), Python Crash Course (3rd edition), Harvard's CS50P, the University of Helsinki Python MOOC, MIT 6.100L, Think Python (3rd edition), futurecoder, Exercism's Python track, freeCodeCamp's Python certification, the official Python tutorial, Kaggle Learn, Google's Python Class and the Teach Computing scheme used in UK schools.

Where they agree, this plan follows them. Ten of the thirteen teach decisions before loops. All of them teach dictionaries after lists, and every one that teaches classes leaves them until after the core data types.

Where they split, this is what the plan does. The counts don't add up to thirteen where a course teaches two things together, skips the topic, or could not be placed from its contents list.

| Question | What the courses do | This plan |
|---|---|---|
| Loops or functions first? | 7 teach loops first, 4 teach functions first | Loops first |
| Functions or lists first? | 8 teach functions first, 3 teach lists first | Functions first |
| Lists or loops first? | 4 teach lists first, 6 teach loops first | Loops first |
| Which kind of loop first? | Most teach both kinds together | The `while` loop first, the `for` loop four lessons later. `while` repeats on a yes-or-no test, which is the idea just learned in the decisions stage, and it makes games possible straight away |
| When can a program ask the user something? | 3 teach it immediately, 1 late, 5 have no unit on it, 4 could not be placed | Lesson 5. A console program is dull until it can ask you something |
| When do files and error-handling arrive? | 7 of 13 teach files. Error-handling is early in 2, alongside files in 2, alongside debugging in 1 and absent in 6. The other 2 could not be placed | Together in stage 7. Reading error messages starts much earlier, at lesson 8 |
| Classes? | 9 include them, 4 leave them out | Stage 8 |
| Testing? | 2 of 13 have a unit on it | Two lessons in stage 9 (85 and 86), then used in lessons 87, 95, 96 and 100 |

Seven of the thirteen aim at writing real programs (Automate, Python Crash Course, CS50P, Helsinki, MIT, Think Python and freeCodeCamp). Six of those seven spend between 29% and 40% of their length on the basics up to functions. This plan spends 38%.

### What most courses leave out

These turn up constantly in real Python and are thin or late in most beginner courses. Six of them (dataclasses, `pathlib`, environment variables, logging, `with` and reading tracebacks) barely appear in any of the thirteen contents lists. This plan gives each one a home:

| Topic | What it is | Lesson |
|---|---|---|
| f-strings | Text with values dropped into it | 7 |
| Reading tracebacks | The report Python prints when a program crashes | 8, 18, 60, 69, 95 |
| Comprehensions | A loop written on one line | 58 |
| `with` | Opens a file and closes it for you | 62 |
| JSON and CSV | The two most common file formats for data | 65, 66 |
| `pathlib` | Working with files and folders | 68 |
| `if __name__ == "__main__":` | The line that means: run this part only when this file is the one being run, not when another file borrows from it | 71 |
| Type hints | Labels saying what kind of value goes where | 75 |
| Dataclasses | A short way to write a class that holds data | 76 |
| `requests` and APIs | Getting data from a service built for programs to read | 79 to 81 |
| Environment variables | Settings and passwords kept outside the code | 82 |
| Command-line arguments | Options typed after a program's name | 83 |
| Logging | A running record of what a program did | 84 |
| pytest | Code that checks your code | 85, 86 |
| pip and requirements files | How add-on packages get installed | 91 |

### The mistakes the lessons are built around

In a study of 643,248 errors made by beginners on a Python teaching site, five error messages made up 62% of the total: invalid syntax, a name that isn't defined, running out of input, an unclosed bracket or quote, and bad indentation. The Fix lessons at 8 and 18 are built around four of those five. The app underlines the syntax ones as you type with no AI involved. A name that isn't defined only shows up when you run the program.

Researchers have also catalogued the wrong ideas beginners form. The lessons that meet the common ones head-on:

| Wrong idea | Tackled in |
|---|---|
| `x = 5` and `5 = x` mean the same, or `=` asks a question | 4, 10 |
| After `y = 2 * x`, changing `x` later changes `y` | 4 |
| `if` and `else` are two separate checks | 12 |
| The body of an `if` repeats while the test is true | 20 |
| A command works without its brackets | 15, 30 |
| Code after `return` still runs | 32 |
| `b = a` makes a copy of a list | 47 |

## Decisions made

Set by the owner on 11 October 2026.

| Question | Decision |
|---|---|
| Copyrighted or branded material | None. Everything in the lessons is invented |
| Internet in lessons | None, except the two GitHub lessons (91 and 92) |
| Fetching data from websites | Taught against a practice service built into the app |
| Git and GitHub | Full lessons. Git works offline, and the two GitHub lessons are the only ones allowed online |
| Project mix | Nine games, three tools and a four-lesson finale |
| Finale | The learner's choice of three |
| Stage sizes | Uneven, decided by the content |
| Inheritance and regular expressions | Recognise only, in lesson 94 |
| Builds | 16, three of them mini-builds |
| Locking | Open menu, ticks for passing |
| Audience | Any age from 11 up |
| Tutor timing | Speaks after about 2 seconds idle |
| Question box | Yes, about the current lesson only |
| Cloud AI | Open to anyone in the model picker |

Still open:

1. **The gap between tutor comments.** 10 seconds is a starting value chosen to go with the 2-second pause.
2. **The three finales.** Register Watch, Treasure Hunt and Tidy-Up are proposals.
3. **Eleven stages, not ten.** Git and GitHub became their own five-lesson stage.

## Sources

Course order:
- Automate the Boring Stuff, 3rd edition: https://automatetheboringstuff.com/
- Python Crash Course, 3rd edition: https://nostarch.com/python-crash-course-3rd-edition
- CS50P: https://cs50.harvard.edu/python/
- University of Helsinki Python MOOC: https://programming-25.mooc.fi/
- MIT 6.100L: https://ocw.mit.edu/courses/6-100l-introduction-to-cs-and-programming-using-python-fall-2022/pages/calendar/
- Think Python, 3rd edition: https://allendowney.github.io/ThinkPython/
- futurecoder: https://github.com/alexmojaki/futurecoder
- Exercism Python track: https://raw.githubusercontent.com/exercism/python/main/config.json
- freeCodeCamp Python certification: https://raw.githubusercontent.com/freeCodeCamp/freeCodeCamp/main/curriculum/structure/superblocks/python-v9.json
- Official Python tutorial: https://docs.python.org/3/tutorial/index.html
- Kaggle Learn Python (via Class Central): https://www.classcentral.com/course/python-74248
- Google's Python Class: https://developers.google.com/edu/python
- Teach Computing, key stages 3 and 4: https://teachcomputing.org/curriculum/key-stage-4

Projects:
- The Big Book of Small Python Projects: https://inventwithpython.com/bigbookpython/
- Invent Your Own Computer Games with Python: https://inventwithpython.com/invent4thed/
- freeCodeCamp, 25 beginner projects: https://www.freecodecamp.org/news/python-projects-for-beginners/
- Real Python project tutorials: https://realpython.com/tutorials/projects/
- JetBrains Academy project list, second-hand from a learner's write-up: https://github.com/nktnlx/jetbrains_python_developer
- CS50P final project: https://cs50.harvard.edu/python/project/

Other:
- GitHub Terms of Service (minimum age): https://docs.github.com/en/site-policy/github-terms/github-terms-of-service

Teaching methods and tutor design:
- PRIMM (Raspberry Pi Foundation summary of Sentance, Waite and Kallia 2019): https://static.raspberrypi.org/files/curriculum/quickreads/11-Pedagogy_Summary_PRIMM_V4_2023.pdf
- Labelled worked examples (Margulieux, Morrison and Decker 2020): https://stemeducationjournal.springeropen.com/articles/10.1186/s40594-020-00222-7
- Ten quick tips for teaching programming (Brown and Wilson 2018): https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1006023
- Teaching Tech Together (Wilson): https://teachtogether.tech/en/index.html
- Frequency of beginner error messages (Pritchard 2015): https://ar5iv.labs.arxiv.org/html/1509.07238
- Python misconceptions catalogue: https://progmiscon.org/misconceptions/Python/
- Focus on Formative Feedback (Shute 2008): https://myweb.fsu.edu/vshute/pdf/shute%202008_b.pdf
- Generative AI Without Guardrails Can Harm Learning (Bastani and others): https://hamsabastani.github.io/education_llm.pdf
- Designing Proactive AI Assistants for Programming (Chen and others 2025): https://arxiv.org/html/2410.04596v2
- CodeHelp (Liffiton and others 2023): https://ar5iv.labs.arxiv.org/html/2308.06921
- Teaching CS50 with AI (Liu and others 2024): https://cs.harvard.edu/malan/publications/V1fp0567-liu.pdf
- Exercism concept exercises: https://exercism.org/docs/building/tracks/concept-exercises
