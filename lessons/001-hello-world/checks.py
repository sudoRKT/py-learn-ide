from pylearn_checks import group, expect


@group("modify")
def modify(t):
    r = t.run()
    expect(r.ok, "Your program stopped with an error. Run it and read the last line of the message.")
    expect(len(r.lines) >= 3, "Keep all three lines on the screen.")
    expect(not r.says("Hello, world"), "Change the first line so that it greets you instead of the world.")
    expect(not r.says("Pip"), "Swap the name Pip for your own name.")


@group("make")
def make(t):
    r = t.run()
    expect(r.ok, "Your program stopped with an error. Run it and read the last line of the message.")
    expect(len(r.lines) >= 3, "Print at least three lines.")
    expect(not r.says("Hello, world"), "Write lines of your own, not the ones from the example.")
    expect(not r.says("I am learning Python"), "Write lines of your own, not the ones from the example.")
    expect("," in t.source, "On one line, print two or more things with a comma between them.")
