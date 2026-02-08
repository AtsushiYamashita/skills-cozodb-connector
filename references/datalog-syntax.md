# Datalog Query Syntax Reference

## Query Structure

```datalog
# Basic query pattern
?[output_columns] := body_clauses
```

Components:

- `?[...]` - Output columns (what to return)
- `:=` - Rule definition
- Body clauses - Conditions separated by commas (AND logic)

## Data Types

| Type     | Example                | Notes                 |
| -------- | ---------------------- | --------------------- |
| `Int`    | `42`, `-7`             | 64-bit signed integer |
| `Float`  | `3.14`, `-0.5`         | 64-bit floating point |
| `String` | `'hello'`, `"world"`   | UTF-8 strings         |
| `Bool`   | `true`, `false`        | Boolean               |
| `Null`   | `null`                 | Null value            |
| `Bytes`  | `x'48656C6C6F'`        | Byte arrays           |
| `List`   | `[1, 2, 3]`            | Ordered collection    |
| `Vec`    | `<vec>[1.0, 2.0, 3.0]` | Vector for HNSW       |
| `Uuid`   | `rand_uuid_v4()`       | UUID type             |

## Schema Definition

### Create Relation

```datalog
:create relation_name {
    key_col1: Type,
    key_col2: Type
    =>
    value_col1: Type,
    value_col2: Type default default_value
}
```

- Columns before `=>` are **keys** (form composite primary key)
- Columns after `=>` are **values**
- `default` keyword sets default values

### Examples

```datalog
# Simple key-value
:create users {
    id: Int
    =>
    name: String,
    email: String
}

# Composite key (graph edge)
:create follows {
    from_user: Int,
    to_user: Int
}

# With defaults
:create posts {
    id: Int
    =>
    title: String,
    content: String default '',
    created_at: Float default now()
}
```

## Data Manipulation

### Insert/Update (Put)

```datalog
?[id, name, email] <- [[1, 'Alice', 'alice@example.com']]
:put users {id => name, email}
```

Multiple rows:

```datalog
?[id, name] <- [
    [1, 'Alice'],
    [2, 'Bob'],
    [3, 'Charlie']
]
:put users {id => name}
```

### Delete (Remove)

```datalog
?[id, name, email] <- [[1, 'Alice', 'alice@example.com']]
:rm users {id, name, email}
```

### Ensure (Insert only if not exists)

```datalog
?[id, name] <- [[1, 'Alice']]
:ensure users {id => name}
```

## Querying Data

### Select All

```datalog
?[id, name, email] := *users{id, name, email}
```

### Filter

```datalog
?[name] := *users{name, age}, age > 25

?[name] := *users{name, email}, starts_with(email, 'admin')
```

### Multiple Conditions (AND)

```datalog
?[name] := *users{name, age, department},
           age > 25,
           department == 'Engineering'
```

### OR Conditions (Multiple Rules)

```datalog
special_users[name] := *users{name, role}, role == 'admin'
special_users[name] := *users{name, age}, age > 60
?[name] := special_users[name]
```

### Negation

```datalog
?[name] := *users{name, id}, not *banned{user_id: id}
```

## Joins

Joins are automatic via shared variables:

```datalog
# Implicit join on user_id
?[user_name, order_amount] :=
    *users{id: user_id, name: user_name},
    *orders{user_id, amount: order_amount}
```

Named variables for clarity:

```datalog
?[follower_name, following_name] :=
    *follows{from: f_id, to: t_id},
    *users{id: f_id, name: follower_name},
    *users{id: t_id, name: following_name}
```

## Aggregations

| Function     | Description           |
| ------------ | --------------------- |
| `count(x)`   | Count non-null values |
| `sum(x)`     | Sum of values         |
| `mean(x)`    | Average               |
| `min(x)`     | Minimum               |
| `max(x)`     | Maximum               |
| `collect(x)` | Collect into list     |
| `unique(x)`  | Count distinct        |

```datalog
?[department, count(name), mean(salary)] :=
    *employees{name, department, salary}
```

## Recursive Queries

### Transitive Closure

```datalog
# Find all nodes reachable from node 1
reachable[to] := *edges{from: 1, to}
reachable[to] := reachable[mid], *edges{from: mid, to}
?[id] := reachable[id]
```

### Shortest Path (Fixed Point)

```datalog
path[to, 1] := *edges{from: 1, to}
path[to, n + 1] := path[mid, n], *edges{from: mid, to}, n < 10
?[node, min(dist)] := path[node, dist]
```

## Query Options

```datalog
?[name, age] := *users{name, age}
:order -age        # Descending by age
:order name        # Ascending by name (default)
:limit 10          # Limit results
:offset 5          # Skip first 5 results
:timeout 30        # Timeout in seconds
```

## Parameters

```javascript
await db.run(
  `
    ?[name] := *users{name, age}, age > $min_age
`,
  { min_age: 25 },
);
```

In Datalog:

```datalog
?[name] := *users{name, department}, department == $dept
```

## Built-in Functions

### String Functions

- `length(s)`, `lowercase(s)`, `uppercase(s)`
- `starts_with(s, prefix)`, `ends_with(s, suffix)`
- `contains(s, substr)`, `regex_matches(s, pattern)`
- `concat(s1, s2)`, `substr(s, start, len)`

### Math Functions

- `abs(x)`, `ceil(x)`, `floor(x)`, `round(x)`
- `sqrt(x)`, `pow(x, n)`, `log(x)`
- `sin(x)`, `cos(x)`, `tan(x)`

### Date/Time

- `now()` - Current timestamp (float)
- `format_timestamp(ts, format)`

### Utility

- `rand_float()`, `rand_int(n)`
- `rand_uuid_v4()`
- `coalesce(a, b, ...)` - First non-null

## System Commands

```datalog
::relations              # List all relations
::columns relation_name  # Show columns
::indices relation_name  # Show indices
::explain query          # Execution plan
::running                # List running queries
::kill query_id          # Kill query
```
