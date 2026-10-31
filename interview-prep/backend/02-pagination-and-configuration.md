# Spring Data Pagination, Sorting, and Configuration Properties

## Part 1: Pagination fundamentals

Pagination retrieves data in smaller chunks instead of loading every record at once. This reduces memory use, response size, database work, and browser rendering cost.

### Important types

- `Pageable` is an interface containing page index, page size, and sorting.
- `PageRequest` creates a concrete `Pageable` object.
- `Page<T>` contains the current records and metadata such as total elements and total pages.
- `Slice<T>` contains the current batch and whether another batch exists, without requiring a total-count query. It can be more efficient when total pages are unnecessary.

Spring Data JPA translates the request into database-specific pagination, commonly SQL `LIMIT` and `OFFSET`.

## Part 2: Basic pagination implementation

### Repository

```java
package com.example.demo.repository;

import com.example.demo.model.Employee;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmployeeRepository
        extends JpaRepository<Employee, Long> {
}
```

`JpaRepository` already provides CRUD methods and pagination support, so no manual `LIMIT` or `OFFSET` query is required.

### Service

```java
package com.example.demo.service;

import com.example.demo.model.Employee;
import com.example.demo.repository.EmployeeRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
public class EmployeeService {

    private final EmployeeRepository employeeRepository;

    public EmployeeService(EmployeeRepository employeeRepository) {
        this.employeeRepository = employeeRepository;
    }

    public Page<Employee> getEmployees(Pageable pageable) {
        return employeeRepository.findAll(pageable);
    }
}
```

The service accepts the pagination request and passes it to the repository. In a production API, map entities to `EmployeeDto` instead of returning entities directly.

### Controller

```java
package com.example.demo.controller;

import com.example.demo.model.Employee;
import com.example.demo.service.EmployeeService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/employees")
public class EmployeeController {

    private final EmployeeService employeeService;

    public EmployeeController(EmployeeService employeeService) {
        this.employeeService = employeeService;
    }

    @GetMapping
    public Page<Employee> getEmployees(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        Pageable pageable = PageRequest.of(
                page,
                size,
                Sort.by("id").ascending()
        );

        return employeeService.getEmployees(pageable);
    }
}
```

Page indexes start at zero. Therefore, `page=0` is the first page and `page=1` is the second page.

## Part 3: Repository filtering with pagination

Spring Data can derive a filtered query from a method name:

```java
public interface EmployeeRepository
        extends JpaRepository<Employee, Long> {

    Page<Employee> findByDepartment(
            String department,
            Pageable pageable
    );
}
```

The service can request the first ten employees in a department:

```java
public Page<Employee> getEmployeesByDepartment(String department) {
    Pageable pageable = PageRequest.of(0, 10);
    return employeeRepository.findByDepartment(department, pageable);
}
```

Spring generates the equivalent filtered and paginated query automatically.

## Part 4: Dynamic sorting and validation

Expose page, size, sort field, and direction as query parameters:

```java
@GetMapping
public Page<Employee> getEmployees(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "10") int size,
        @RequestParam(defaultValue = "id") String sortBy,
        @RequestParam(defaultValue = "asc") String direction) {

    if (page < 0) {
        throw new IllegalArgumentException("Page must be zero or greater");
    }
    if (size < 1 || size > 100) {
        throw new IllegalArgumentException("Size must be between 1 and 100");
    }

    Set<String> allowedSortFields = Set.of("id", "name", "salary");
    if (!allowedSortFields.contains(sortBy)) {
        throw new IllegalArgumentException("Unsupported sort field");
    }

    Sort sort = direction.equalsIgnoreCase("desc")
            ? Sort.by(sortBy).descending()
            : Sort.by(sortBy).ascending();

    return employeeService.getEmployees(PageRequest.of(page, size, sort));
}
```

Allowlisting sort fields prevents invalid property names and helps avoid expensive or unintended queries. Always enforce a maximum page size.

## Part 5: API examples

Start the application:

```bash
./mvnw spring-boot:run
```

First ten employees:

```bash
curl "http://localhost:8080/employees?page=0&size=10"
```

Next ten employees:

```bash
curl "http://localhost:8080/employees?page=1&size=10"
```

Third page with twenty records:

```bash
curl "http://localhost:8080/employees?page=2&size=20"
```

Sort by name ascending:

```bash
curl "http://localhost:8080/employees?page=0&size=10&sortBy=name&direction=asc"
```

Sort by salary descending:

```bash
curl "http://localhost:8080/employees?page=0&size=5&sortBy=salary&direction=desc"
```

Example `Page` response:

```json
{
  "content": [],
  "number": 0,
  "size": 10,
  "totalElements": 45,
  "totalPages": 5,
  "first": true,
  "last": false
}
```

If there are 45 employees and the page size is 10, Spring reports five total pages.

## Part 6: Applying this to Bilix

The first practical pagination slice should be cashier Order History:

```http
GET /api/orders/branch/1/paged?page=0&size=20&sortBy=createdAt&direction=desc
```

Then apply the same pattern to products, customers, employees, refunds, and transactions. Do not paginate dashboard totals; those should be aggregate values.

## Part 7: Configuration properties

Configuration properties keep environment-specific values out of Java code. They can be changed for development, testing, and production without recompiling business logic.

### `application.properties`

```properties
server.port=8081

employee.app.name=Employee Management System
employee.app.max-employees=100
employee.app.enabled=true
```

### Type-safe properties class

```java
package com.example.demo.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "employee.app")
public class EmployeeProperties {

    private String name;
    private int maxEmployees;
    private boolean enabled;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public int getMaxEmployees() {
        return maxEmployees;
    }

    public void setMaxEmployees(int maxEmployees) {
        this.maxEmployees = maxEmployees;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }
}
```

Register it by adding `@ConfigurationPropertiesScan`:

```java
@SpringBootApplication
@ConfigurationPropertiesScan
public class DemoApplication {

    public static void main(String[] args) {
        SpringApplication.run(DemoApplication.class, args);
    }
}
```

### Use properties in a service

```java
@Service
public class EmployeeService {

    private final EmployeeProperties properties;

    public EmployeeService(EmployeeProperties properties) {
        this.properties = properties;
    }

    public String getAppInfo() {
        return properties.getName()
                + ", Maximum employees: "
                + properties.getMaxEmployees();
    }
}
```

Spring binds `employee.app.max-employees` to the Java `maxEmployees` field and converts the string property to an integer.

## Profiles and secrets

Use profile-specific files:

```text
application-dev.properties
application-test.properties
application-prod.properties
```

Use environment variables or a secret manager for passwords, JWT secrets, payment keys, and database credentials. Do not commit real secrets to properties files.

## `@Value` versus `@ConfigurationProperties`

`@Value` is suitable for one or two individual values:

```java
@Value("${server.port}")
private int port;
```

`@ConfigurationProperties` is better for a related, type-safe group of settings because it is organized, reusable, and easier to validate.

## Interview questions

**Why use pagination?**  
To reduce database, network, memory, and rendering costs for large collections.

**What does `Pageable` contain?**  
Page index, page size, and sorting information.

**Why does `Page` sometimes cost more than `Slice`?**  
`Page` normally needs a count query to calculate total elements/pages; `Slice` only determines whether another batch exists.

**Why should page size be limited?**  
To prevent a client from requesting an unnecessarily large response and overloading the database.

**Why allowlist `sortBy`?**  
To prevent invalid properties and restrict sorting to safe, indexed fields.

**Why use `ConfigurationProperties`?**  
It externalizes grouped settings in a type-safe, maintainable way and supports environment-specific configuration.

