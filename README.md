# Hack the North 2024 Backend Challenge

This is my submission for the Hack the North 2024 backend challenge.

# Setup Instructions:
I uploaded a hackers.db file to the Git repository. You can also access it on this [Google Drive](https://drive.google.com/drive/folders/1qXLXw-aWHj-75P1KUbMZEdV8jZbkgaj0?usp=sharing).


This has the database schema and data already set up (hackers.db). The database contains about 100 users from the provided JSON data, skills, 10 events, and ~40-50 event_registrations. You should be able to run `docker-compose up` and it will start the server for you. If something goes wrong with the .db file, please try redownloading hackers.db from the Google Drive link I put above.

If you'd like to add more of your own data through a JSON file, you can use a POST /init_db endpoint I created. Edit the corresponding JSON filenames as needed in ./database.js. 

# Design:

## Tech Stack:
I used Javascript (Node and Express) and SQLite for this challenge.

## Endpoints I implemented:

### Users:
I created an endpoint that returned user information. It returns both general fields and also the user's skills:
```
GET /users/1
Returns:
{
    "id": 1,
    "name": "Breanna Dillon",
    "email": "lorettabrown@example.net",
    "phone": "+1-924-116-7963",
    "checked_in": 0,
    "skills": [
        {
            "name": "Swift",
            "rating": 4
        },
        {
            "name": "OpenCV",
            "rating": 1
        }
    ]
}
```

I created an endpoint that could be used to edit user data:
```
PUT /users/1
JSON body:
{
    "userUpdates":{
        "email": "bob@gmail.com"
    },

    "skillsUpdates": {
        "add": [
            {"skill": "PHP", "rating": 5},
            {"skill": "MongoDB", "rating": 9}
        ],
        "remove": [
            {"skill": "Swift"}
        ],
        "update": [
            {"skill": "OpenCV", "rating": 2}
        ]
        
    }
    
}
```
The API caller can specify which skills they'd like to add, remove, and update. If the skill doesn't already exist, it creates a new one. If the user already has the skill, an error is returned. Adding and removing skills will affect the frequency value of the skill.

There are also endpoints for creating users and skills, if you want to use for testing:
```
POST /users
JSON body:
{
    "name" : "test user 3",
    "email" : "test3@gmail.com",
    "phone" : "000-000-0000",
    "checked_in" : 0,
    "skills" : [
        {
            "name" : "PHP",
            "rating" : 9
        },
        {
            "name" : "C++",
            "rating" : 6
        },
        {
            "name" : "Java",
            "rating" : 6
        },
        {
            "name" : "React",
            "rating": 6
        }
        
    ]
}
```

```
POST /skills
body JSON:
{
    "name" : "BongoDB"
}
```
Note that you can't create the same skill twice (name is unique). You also aren't allowed to put the same skill twice when creating a user. Similarly to the PUT endpoint, skills that don't already exist will be added.

### Skills:
I created an endpoint used to get skills. You can filter them by quantity using the query:
```
GET /skills/?min_frequency=4&max_frequency=5
returns:
[
    {
        "id": 1,
        "name": "Swift",
        "frequency": 5
    },
    {
        "id": 4,
        "name": "Elixir",
        "frequency": 5
    },
    ...
    {
        "id": 63,
        "name": "Rust",
        "frequency": 4
    },
    {
        "id": 88,
        "name": "JavaScript",
        "frequency": 4
    }
]
```

## Extra Features:

### User check-in:
The user table has a checked_in field that can be used to know if the user has been checked into Hack the North.

### Events:
I have an event table! The idea behind this is to let users be able to register for different events (ex. similar to the QR code scanning). 

An event looks like this:
```
{
    "id": 1,
    "name": "Breakfast",
    "location": "3rd Floor E7",
    "start_time": "2024-02-22 06:00:00",
    "end_time": "2024-02-22 10:00:00",
    "description": "Pancakes!",
    "attendees": 3
},

```

There is important info like locations, start/end times, description, and the number of attendees, which changes dynamically based on people registering/unregistering. You can get a list of all events by running `GET /events`.

To register a user, make a POST request to the /event_registrations endpoint. This endpoint is meant to handle event registration for users. You can't register for the same event twice.
```
POST /event_registrations
JSON Body:
{
    "userID" : 2,
    "eventID" : 2
}
```

To get information about events, you can query the event_registrations endpoint. It is very flexible in its filtering. For example:

#### No Filter:
Returns a list of all registrations, providing just user_id and event_id.
```
GET /event_registrations
[
    {
        "user_id": 3,
        "event_id": 1
    },
    {
        "user_id": 59,
        "event_id": 3
    },
    ...
]
```

#### Provide UserID:
Filters all events registered by the specified user. Provides information about the event. Could be used in a user profile/"My Events" page.
```
GET /event_registrations?userID=15

Returns:
[
    {
        "event": {
            "id": 2,
            "name": "C++ Workshop from Brad Lushman",
            "location": "Room 1",
            "start_time": "2024-02-22 09:00:00",
            "end_time": "2024-02-22 11:30:00",
            "description": "Brad Lushman will be providing a workshop on software development in C++.",
            "attendees": 6
        }
    },
    {
        "event": {
            "id": 6,
            "name": "Python for Data Science",
            "location": "Room 3C",
            "start_time": "2024-02-22 09:30:00",
            "end_time": "2024-02-22 12:00:00",
            "description": "An introduction to using Python in the field of data science.",
            "attendees": 4
        }
    }
]
```

#### Provide eventID:
Filters provides all users that are registered for an event. Provides important information about users.
```
GET /event_registrations?eventID=2

Returns:
[
    {
        "user": {
            "id": 15,
            "name": "Ashley Jenkins",
            "email": "williamsalexandra@example.org"
        }
    },
    ...
     {
        "user": {
            "id": 64,
            "name": "Brandi Dickerson",
            "email": "deannaroberts@example.org"
        }
    },
    {
        "user": {
            "id": 86,
            "name": "Drew Vincent",
            "email": "hamptonmichelle@example.net"
        }
    }
]
```
#### Provide both eventID and userID:
This will return the event and user who registered to that event (if the relationship exists).

```
GET /event_registrations?userID=15&eventID=2

Returns:
[
    {
        "user": {
            "id": 15,
            "name": "Ashley Jenkins",
            "email": "williamsalexandra@example.org"
        },
        "event": {
            "id": 2,
            "name": "C++ Workshop from Brad Lushman",
            "location": "Room 1",
            "start_time": "2024-02-22 09:00:00",
            "end_time": "2024-02-22 11:30:00",
            "description": "Brad Lushman will be providing a workshop on software development in C++.",
            "attendees": 6
        }
    }
]
```
#### Provide start time/end time:
Filters events based on the their start time, end time, or both. Will search for events that start AFTER the given start time and BEFORE the given end time. If no other filters are provided, it returns just the user_id and event_id, otherwise it'll provide the data given other filters (ex. providing userID will also include more detailed event data).

The date uses ISO 8601 format, which is validated in the backend (try entering something that doesn't follow ISO 8601 😁, it'll catch it).
```
Try these queries out:

GET /event_registrations?userID=15&startTime=2024-02-22 07:00:00
GET /event_registrations?userID=15&startTime=2024-02-22 07:00:00&endTime=2024-02-22 11:45:00

```
I had some other ideas for the events, including different types of events (workshops, meals, activities), but I didn't get to them in time. I added them in my ER diagram if you want to check it out.

## Design Choices:
Here is an ER diagram that I made for this: [Link to ER Diagram](https://lucid.app/lucidchart/ebf217db-e02b-4c2d-98c6-aeffbbc1d574/edit?view_items=nLbcnQ6UUeFP&invitationId=inv_75d04ca2-8507-40eb-91ba-1067c75ffe4e)

I also uploaded it as a PDF to the [Google Drive](https://drive.google.com/drive/folders/1qXLXw-aWHj-75P1KUbMZEdV8jZbkgaj0?usp=sharing) if that's easier.

### Users, Skills, and Events:
Since I was working with SQL, I used an associative table to model the many-to-many relationship between users and skills. This allowed me to easily keep track of which skills belonged to a user. I made a similar design choice for the relationship between users and events.

### Endpoints:
I decided to make queries to event registrations into one endpoint, instead of separating it (ex. /users/:id/events and /events/:id/users). I made this decision because much of the logic was similar and creating two separate endpoints for transactions that are very similar to each other. However, I also considered the other choice, since it would offer easier logic when constructing the query.

### Managing Skill Frequencies
I created a trigger in my SQL db to increase a skill's quantity if it was added to a user in the users_skills table. I also created a trigger to decrease a skill's quantity if removed from a user.

I decided to denormalize the skill's quantity, because it would make it easier for reading. Since it was mentioned that skills are not frequently added/removed, it means that we're typically writing to skills a lot less often than reading from them. Thus, keeping it has a quantity field made more sense to me than counting all the skills each time.

### Event Types:
My idea for the different event types was to try and implement something similar to an inheritance model, where an event could be extended with more information through another table (workshops, meals, etc.). Instead of keeping all info in one table, I wanted to normalize the different event types here, because I felt it gave room to add new event types with different data flexibly. This would avoid irrelevant data and null columns (ex. if an event isn't a workshop, it has no need for a speaker field). Unfortunately I didn't get to implement this.

### Atomicity:
Using SQLite's rollback features, I ensured that anytime I was making several changes to the database, I would rollback the changes when the transaction is interrupted (e.g. an error).

### Error handling:
I wrapped all of my asynchronous transactions with try/catch blocks to handle errors. I also made important fields/identifiers UNIQUE or PRIMARY KEYS to prevent duplicates (ex. more than one user with same email, skill with same name, registration with same event and user, etc.)

## Improvements
If I had more time, I would have tried to improve my data validation. I used express-validator to validate the dates, as well as some other data, but didn't use it more extensively to validate other data. I would also want to improve my error handling and provide more detailed error messages. I'd also like to implement the ideas I had for the events tables.

Thanks for looking at my code! This was a really fun challenge and I would love to be a part of Hack the North's backend team :) 


