
### OPEN BUGS

  * Streets are not validated, which allows for a lot of redundancies, e.g. "Fairview Avenue" vs. "Fairview Ave." vs. "Fairview Ave".
  * Because segments ask for two coordinates to draw a line between, nothing is pegged to actual sidewalks. Perhaps what we do is create a grid of sidewalks that then segments can be drawn against, making creation easier.
  * Not just streets, but all input should be validated against what already exists in the database, e.g. if the contractor is "Dutch Bros" and there's a "Dutch Brothers" in the database, ask the user if Dutch Brothers is correct.



### FOR ALL SESSIONS

  * I want Claude to read all TODO.md at the beginning of every session.
  * Claude should read through all .md files in the project directory before building a plan.
  * This project is using Node.js and CSS primarily. If anything more complicated needs to be developed, it should use Typescript or Golang.
  * Rules for every feature should update documentation in a markedown file to discuss requirements, status, when to use it, etc.
  * Testing coverage should target 90% unit test coverage and be passing test runs







 
 * Good chat management: Regardless of your LLM of choice, you tend to get way better results if you keep to a kind of "develop feature X" - okay it's good? new chat window time. Otherwise you start to encounter all the weird memory/token issues with context a lot sooner, especially with complex asks.
Cannot state enough that rules and project settings are game changing.
 * Build out each of those (with the agent if you prefer, or solo) to define what they are. i was very explicit that I wanted a folder hierarchy that was delineated by backend-frontend-debug-test-etc and what falls into each.
 * Outlined what I want and expect from testing, that i dont want random data unless i prompt for it, that i dont want to it just create test files, that i always want it clean up any test files we do make, etc. Especially when iterating quickly on stuff you can produce tons of (potentially crap) stuff pretty quickly.
 * I tend to treat it like  it's an employee or at work in terms of clarifying stuff deeper and deeper and keeping everything tracked. Make a high level strategy of Ben wants to make the next whatever, Uber competitor.  Great, that starts with some rough plan for scaling, backend, front end, which mobile platform first, etc.  Then I like to keep tiered 'to-do' list at each level so i can very literally go  "What's left in frontend dev?" and have it read in the context and see that i scoped 10 big features, and that we have 5 other feature .md files tied to this fully done and implemented and 5 more in XYZ states, or 3 of them ready but not tested, or whatever.
