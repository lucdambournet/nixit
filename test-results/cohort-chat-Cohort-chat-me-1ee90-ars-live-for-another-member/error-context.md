# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: cohort-chat.spec.ts >> Cohort chat >> message sent by one member appears live for another member
- Location: tests/e2e/cohort-chat.spec.ts:73:3

# Error details

```
Test timeout of 30000ms exceeded.
```

# Page snapshot

```yaml
- generic [ref=e5]:
  - generic [ref=e6]:
    - img "NixIt" [ref=e7]
    - paragraph [ref=e8]: Quit together. Stay accountable.
  - generic [ref=e9]:
    - heading "Sign in to NixIt" [level=1] [ref=e10]
    - generic [ref=e11]:
      - generic [ref=e12]:
        - generic [ref=e13]: Email
        - textbox "you@example.com" [ref=e15]
      - generic [ref=e16]:
        - generic [ref=e17]: Password
        - textbox "••••••••" [ref=e19]
      - button "Sign in" [ref=e20] [cursor=pointer]
    - button "Forgot password?" [ref=e22] [cursor=pointer]
  - paragraph [ref=e23]:
    - text: Don't have an account?
    - button "Sign up" [ref=e24] [cursor=pointer]
```