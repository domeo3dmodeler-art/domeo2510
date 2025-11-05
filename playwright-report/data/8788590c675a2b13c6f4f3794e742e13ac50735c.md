# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - link "Domeo" [ref=e5] [cursor=pointer]:
        - /url: /
      - text: •Вход
      - paragraph [ref=e6]: Войдите в систему для доступа к конфигураторам
    - generic [ref=e7]:
      - generic [ref=e8]:
        - generic [ref=e9]:
          - generic [ref=e10]: Email
          - textbox "Email" [ref=e11]:
            - /placeholder: your@email.com
            - text: wrong@example.com
        - generic [ref=e12]:
          - generic [ref=e13]: Пароль
          - generic [ref=e14]:
            - textbox "Пароль" [active] [ref=e15]:
              - /placeholder: ••••••••
              - text: wrongpassword
            - button [ref=e16] [cursor=pointer]:
              - img [ref=e17]
      - button "Вход..." [disabled] [ref=e21]
      - link "← Вернуться на главную" [ref=e23] [cursor=pointer]:
        - /url: /
  - region "Notifications alt+T"
  - button "Open Next.js Dev Tools" [ref=e29] [cursor=pointer]:
    - img [ref=e30]
  - alert [ref=e33]
```