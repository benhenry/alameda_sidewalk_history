
### FEATURES

1. Set up Cloud SQL database
2. Configure environment variables and secrets
3. Set up Cloud Storage for file uploads
4. Configure custom domain (optional)



### OPEN BUGS

  * Streets are not validated, which allows for a lot of redundancies, e.g. "Fairview Avenue" vs. "Fairview Ave." vs. "Fairview Ave".
  * Because segments ask for two coordinates to draw a line between, nothing is pegged to actual sidewalks. Perhaps what we do is create a grid of sidewalks that then segments can be drawn against, making creation easier.
  * Not just streets, but all input should be validated against what already exists in the database, e.g. if the contractor is "Dutch Bros" and there's a "Dutch Brothers" in the database, ask the user if Dutch Brothers is correct.

