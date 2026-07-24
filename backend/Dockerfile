# ---- Build Stage ----
FROM eclipse-temurin:17-jdk-alpine AS build
WORKDIR /app
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw dependency:go-offline -B
COPY src/ src/
RUN ./mvnw package -DskipTests -B

# ---- Run Stage ----
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENV JAVA_OPTS=""
ENV SPRING_PROFILES_ACTIVE="prod"
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar --spring.profiles.active=$SPRING_PROFILES_ACTIVE"]
