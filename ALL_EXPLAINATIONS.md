**--> Access Token**

A short-lived key that proves you are logged in.

Sent with each request (usually in headers or cookies).


Authenticate requests → Sent with API calls (in headers or cookies) so the server knows who you are.

Fast \& secure → Since it expires quickly (e.g., 15 minutes), even if stolen, it limits damage.

Lightweight → Usually contains user info (id, email, role) so server can verify without extra DB lookup.


Work of Access Token:


An Access Token is like a temporary pass that proves “Yes, this user is logged in”.

Every time you do something (open profile, fetch data, etc.), your browser/app sends this token to the server.

The server checks the token → if valid, it gives you the data → if expired/invalid, it rejects the request.



**--> Refresh Token**


A long-lived key stored safely (usually in DB or secure cookie).

Used to get a new Access Token when the old one expires.


Get new Access Tokens → When your access token expires, refresh token is used to request a fresh one.

Keeps user logged in → Without forcing them to log in again every 15 minutes.

Extra security layer → Stored securely (often in DB \& HttpOnly cookie). If refresh token is invalid, server can block token refresh.


Work of Refresh Token:


A Refresh Token is like a backup key.

When your Access Token (short pass) expires, you don’t need to log in again.

Instead, you use the Refresh Token to ask the server:

“Hey, my pass expired. Please give me a new one.”

The server checks the Refresh Token → if valid, it gives you a new Access Token.



**-->Use of $set in MongoDB**

The $set operator is used to update specific fields in a document without overwriting the whole document.

What $set does:

$set means “change only this field” in the database.

It updates just the part you mention, without touching the rest.



**-->What $lookup does**

$lookup is used to join two collections (like SQL joins).

It lets you pull related data from another collection into your query result.
$lookup = join in MongoDB.



**-->What $match does**

$match is like a filter (similar to WHERE in SQL).

It only passes documents that satisfy the condition to the next stage in the pipeline.