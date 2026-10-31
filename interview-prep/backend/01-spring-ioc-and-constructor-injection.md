# Spring IoC and Constructor Injection

## Plain Java without Spring

In plain Java, a dependency must be created manually before it can be passed to another class.

```java
public class GreetService {
    public String greet() {
        return "Hello World!";
    }
}

public class GreetController {
    private final GreetService greetService;

    public GreetController(GreetService greetService) {
        this.greetService = greetService;
    }

    public String handleRequest() {
        return greetService.greet();
    }
}
```

The application must create the objects in the correct order:

```java
public class Main {
    public static void main(String[] args) {
        GreetService serviceInstance = new GreetService();
        GreetController controllerInstance =
                new GreetController(serviceInstance);

        System.out.println(controllerInstance.handleRequest());
    }
}
```

`new GreetService()` creates the service object. That object reference is passed to `new GreetController(serviceInstance)`. Inside the constructor, `this.greetService = greetService` stores the reference in the controller's field.

## Spring-managed approach

Spring's IoC container creates and connects the objects:

```java
@Service
public class GreetService {
    public String greet() {
        return "Hello World!";
    }
}

@RestController
public class GreetController {
    private final GreetService greetService;

    public GreetController(GreetService greetService) {
        this.greetService = greetService;
    }

    @GetMapping("/greet")
    public String handleRequest() {
        return greetService.greet();
    }
}
```

Because these classes are detected during component scanning, application code does not need to call `new GreetService()` or `new GreetController()`.

## What happens during startup?

Conceptually, Spring performs these steps:

1. Component scanning finds `@Service`, `@RestController`, and other bean annotations.
2. Spring builds a dependency graph.
3. It creates `GreetService`, which has no dependencies.
4. It stores the service bean in the `ApplicationContext`.
5. It sees that `GreetController` requires a `GreetService` constructor argument.
6. It retrieves the managed service bean and passes it to the controller constructor.
7. It stores the controller bean and registers its request mapping.

Conceptually, the container performs something similar to:

```java
GreetService serviceBean =
        GreetService.class.getDeclaredConstructor().newInstance();

GreetController controllerBean =
        GreetController.class
            .getDeclaredConstructor(GreetService.class)
            .newInstance(serviceBean);
```

The actual Spring lifecycle also includes bean post-processors, proxies, configuration, scopes, and web-server registration, so this is a teaching model rather than the complete internal implementation.

## What `this.greetService = greetService` means

- `greetService` on the right is the constructor parameter.
- `this.greetService` on the left is the controller's field.
- The assignment stores the dependency received from the caller.
- In plain Java, the caller is your `main` method or factory.
- In Spring, the caller is the IoC container.

## Side-by-side comparison

| Context | Who creates the service? | Who creates the controller? | How the dependency is assigned |
| --- | --- | --- | --- |
| Plain Java | Your code calls `new GreetService()` | Your code calls `new GreetController(service)` | The service reference is passed directly to the constructor |
| Spring | The IoC container creates the `@Service` bean | The IoC container creates the `@RestController` bean | Spring resolves the bean by type and passes it to the constructor |

## Why constructor injection is preferred

```java
private final GreetService greetService;
```

Constructor injection is preferred because:

- The dependency is required and cannot be forgotten.
- The field can be `final` and immutable after construction.
- The class is easy to unit-test without starting Spring.
- Dependencies are visible in the constructor.
- Circular dependencies are detected earlier.

Unit-test example:

```java
GreetService fakeService = new GreetService();
GreetController controller = new GreetController(fakeService);

assertEquals("Hello World!", controller.handleRequest());
```

With Lombok, Bilix classes may use:

```java
@RestController
@RequiredArgsConstructor
public class StoreController {
    private final StoreService storeService;
}
```

`@RequiredArgsConstructor` generates the constructor for final fields. Spring then uses that constructor for dependency injection.

## Stack and heap reference model

When explaining `this.greetService = greetService`, it is useful to visualize two different things:

- The constructor parameter is a temporary local reference held in the current stack frame.
- The fields of `GreetService` and `GreetController` belong to objects allocated on the heap.
- The controller's field receives a copy of the reference to the same `GreetService` object.

```text
                 STACK (current constructor frame)
        ┌─────────────────────────────────────────────┐
        │ parameter `greetService`                     │
        │ reference ───────────────────────────────┐   │
        └─────────────────────────────────────────┼───┘
                                                  │
                                                  ▼
                 HEAP (managed object memory)
        ┌──────────────────────────────┐
        │ GreetService object          │
        │ service reference target     │
        └──────────────────────────────┘
                         ▲
                         │ same object reference target
        ┌─────────────────┴────────────┐
        │ GreetController object       │
        │ field `this.greetService` ───┘
        └──────────────────────────────┘
```

Step by step:

1. `new GreetService()` creates one service object on the heap.
2. The constructor receives a reference to that object in its local parameter.
3. `this.greetService = greetService` copies that reference into the controller object's field.
4. The constructor's stack frame disappears after construction.
5. The controller field remains reachable and can call `greetService.greet()` during later requests.

The labels `0x7FFF` and `0x9ABC` are teaching placeholders, not guaranteed Java addresses. Java code normally sees references, not raw pointers, and the garbage collector may move objects internally. The important idea is that both references point to the same `GreetService` object; no second service object is created by the assignment.

## Interview questions

**What is IoC?**  
Inversion of Control means object creation and dependency wiring are managed by a framework instead of by application classes.

**What is dependency injection?**  
It is the process of supplying an object with the dependencies it needs rather than making it construct those dependencies itself.

**Why does Spring know which object to inject?**  
It scans registered components, builds the bean graph, and resolves the constructor parameter by type and, when necessary, qualifier/name.

**What happens if two beans have the same type?**  
Spring needs disambiguation using `@Qualifier`, `@Primary`, or a distinct bean name.

**Is Spring literally only calling `new` with reflection?**  
Object construction is conceptually similar, but Spring also manages scopes, lifecycle callbacks, proxies, configuration, and post-processing.

## `@Autowired` versus no `@Autowired`

The same constructor-injection example can be understood in three contexts:

```java
@Service
public class GreetService {
    public String greet() {
        return "Hello World!";
    }
}

@RestController
public class GreetController {
    private final GreetService greetService;

    public GreetController(GreetService greetService) {
        this.greetService = greetService;
    }

    @GetMapping("/greet")
    public String handleRequest() {
        return greetService.greet();
    }
}
```

| Scenario | Is `@Autowired` needed? | Who creates the service? | Who creates the controller? |
| --- | --- | --- | --- |
| Modern Spring with one constructor | No; Spring detects the only constructor | Spring IoC container | Spring IoC container |
| Spring with multiple constructors | Yes, on the constructor Spring should use | Spring IoC container | Spring IoC container |
| Plain Java without Spring | No; annotations are ignored | Your code calls `new` | Your code calls `new` |

### Modern Spring: one constructor

Since Spring 4.3, if a bean has exactly one constructor, Spring automatically uses it for dependency injection:

```java
public GreetController(GreetService greetService) {
    this.greetService = greetService;
}
```

Conceptually, Spring scans the classes, creates the service bean, finds the controller's only constructor, retrieves the service bean, and invokes that constructor with it. Writing `@Autowired` here is optional and usually omitted for cleaner code.

### Spring with multiple constructors

When multiple constructors exist, explicitly mark the dependency-injection constructor:

```java
@RestController
public class GreetController {
    private final GreetService greetService;

    @Autowired
    public GreetController(GreetService greetService) {
        this.greetService = greetService;
    }

    // This secondary constructor would need a valid fallback design.
    public GreetController() {
        this.greetService = new DefaultGreetService();
    }
}
```

`@Autowired` tells Spring's dependency-injection machinery which constructor to select. It does not create a service by itself; Spring must already have a matching `GreetService` bean.

### Plain Java without Spring

Spring annotations have no effect when the class is run without a Spring `ApplicationContext`:

```java
public class Main {
    public static void main(String[] args) {
        GreetService serviceInstance = new GreetService();
        GreetController controllerInstance =
                new GreetController(serviceInstance);

        System.out.println(controllerInstance.handleRequest());
    }
}
```

Your code creates both objects and passes the service reference to the controller. There is no automatic component scanning or injection.

### Key takeaway

- `@Autowired` is optional for a single constructor in modern Spring.
- `@Autowired` is useful when Spring must choose among multiple constructors.
- Without Spring, `@Autowired`, `@Service`, and `@RestController` are just annotations; Java does not use them to create objects.
- The `0x7FFF` and `0x9ABC` values are illustrative reference labels, not stable raw JVM addresses.

## Spring Boot application entry point

### Main application class

```java
package com.example.demo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class DemoApplication {

    public static void main(String[] args) {
        SpringApplication.run(DemoApplication.class, args);
    }
}
```

### How to explain this to an instructor

“First, I create a main class called `DemoApplication`. I annotate it with `@SpringBootApplication`, which is the entry point of my Spring Boot application.

This annotation combines three important annotations:

- `@Configuration` — allows the class to provide Spring bean configuration.
- `@EnableAutoConfiguration` — allows Spring Boot to configure components based on the dependencies and configuration present in the project.
- `@ComponentScan` — enables Spring to scan the package and its subpackages for components such as controllers, services, and repositories.

Inside the `main()` method, I call `SpringApplication.run()`. This bootstraps the application, creates and configures the Spring application context, and starts the embedded web server when the web starter is present.

So, this class serves as the starting point of the application, and Spring Boot handles most of the configuration automatically.”

### Running the application

For a Maven project on macOS/Linux:

```bash
./mvnw spring-boot:run
```

On Windows:

```bat
mvnw.cmd spring-boot:run
```

If the project includes Spring Web, the embedded server typically starts on port `8080` unless `server.port` changes it in configuration.

Expected startup output contains a message similar to:

```text
Started DemoApplication in 3.2 seconds
Tomcat started on port 8080
```

The main advantage is that Spring Boot provides a simple entry point and automatic configuration, so we can focus more on application logic instead of writing extensive setup code.

## Service and controller dependency injection example

### `EmployeeService.java`

```java
package com.example.demo;

import org.springframework.stereotype.Service;

@Service
public class EmployeeService {

    public String getEmployee() {
        return "Employee details retrieved successfully!";
    }
}
```

Instructor explanation: “I use `@Service` to tell Spring that this class contains business logic and should be managed as a Spring bean.”

### `EmployeeController.java` using constructor injection

```java
package com.example.demo;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class EmployeeController {

    private final EmployeeService employeeService;

    @Autowired
    public EmployeeController(EmployeeService employeeService) {
        this.employeeService = employeeService;
    }

    @GetMapping("/employee")
    public String getEmployee() {
        return employeeService.getEmployee();
    }
}
```

Instructor explanation: “`@RestController` exposes REST endpoints. I use `@Autowired` on the constructor to inject the `EmployeeService` dependency. Spring finds the service bean and passes it to the controller, so I do not create the object manually with `new`.”

Because this controller has only one constructor, `@Autowired` is optional in modern Spring:

```java
public EmployeeController(EmployeeService employeeService) {
    this.employeeService = employeeService;
}
```

### Testing the endpoint

Start the application:

```bash
./mvnw spring-boot:run
```

Send a request:

```bash
curl http://localhost:8080/employee
```

Expected response:

```text
Employee details retrieved successfully!
```

### Why dependency injection matters

“`@Autowired` enables dependency injection, which reduces tight coupling between classes. Spring manages the dependency lifecycle and provides the required object. This improves maintainability, reusability, and testability.”

### Three dependency-injection styles

#### Constructor injection — preferred

```java
public EmployeeController(EmployeeService employeeService) {
    this.employeeService = employeeService;
}
```

Required dependencies are visible, fields can be `final`, and the class can be tested with a manually supplied fake or mock service.

#### Setter injection

```java
private EmployeeService employeeService;

@Autowired
public void setEmployeeService(EmployeeService employeeService) {
    this.employeeService = employeeService;
}
```

This can be useful for optional or replaceable dependencies, but the object may exist temporarily without all required collaborators.

#### Field injection

```java
@Autowired
private EmployeeService employeeService;
```

It is concise, but dependencies are hidden, fields cannot naturally be `final`, and unit tests need reflection or a Spring context. It is generally discouraged for application code.

Conclusion: “Although `@Autowired` can be used with constructors, setters, and fields, I prefer constructor injection because it makes dependencies clear, supports immutability, and simplifies unit testing. Spring also supports dependency injection without explicitly writing `@Autowired` when there is only one constructor.”

## Behind-the-scenes Spring Boot flow

Instructor explanation:

“Spring Boot uses annotations as metadata to configure the application, manage objects, and handle HTTP requests.

First, `@SpringBootApplication`. When we run `main()`, `SpringApplication.run()` bootstraps the application. Spring Boot creates an `ApplicationContext`, which acts as a container for managing Spring beans. The annotation combines `@Configuration`, `@EnableAutoConfiguration`, and `@ComponentScan`.

Component scanning discovers classes annotated with `@Service`, `@RestController`, and other component annotations. Auto-configuration configures components based on the dependencies and settings available in the project.

Second, dependency injection. Spring creates and manages objects called beans inside the application context. When a controller depends on an `EmployeeService`, Spring identifies the required bean and injects it into the controller constructor. This avoids manually creating dependencies with `new` and reduces tight coupling.

Third, `@RestController`. Spring detects the controller during component scanning and registers its request mappings. When an HTTP request arrives, Spring MVC's `DispatcherServlet` acts as the front controller and routes the request to the appropriate handler method. The method executes, and its return value is written to the HTTP response. If it returns a Java object, an HTTP message converter such as Jackson typically serializes it into JSON.

Finally, the application lifecycle. Spring prepares the environment, creates and configures the application context, discovers and initializes beans, resolves dependencies, and completes startup. For a web application, it starts the embedded server. During graceful shutdown, Spring closes the context and invokes applicable bean-destruction callbacks.

In summary, `@SpringBootApplication` bootstraps configuration and component discovery, dependency injection connects beans, and `@RestController` exposes functionality through HTTP endpoints.”

### Quick request flow

```text
main()
  ↓
SpringApplication.run()
  ↓
Create ApplicationContext
  ↓
Scan components and apply auto-configuration
  ↓
Create beans and inject dependencies
  ↓
Start embedded web server
  ↓
HTTP Request → DispatcherServlet
  ↓
Controller → Service → HTTP Response
```

Important technical detail: `@Autowired` does not itself create the dependency. Spring's bean factory resolves an appropriate managed bean and supplies it. It is also optional on a class's single constructor in modern Spring.
