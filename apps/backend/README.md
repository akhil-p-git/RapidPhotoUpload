# RapidPhotoUpload Backend

Enterprise-grade Spring Boot backend for high-volume photo upload platform.

## Tech Stack

- **Java 17**
- **Spring Boot 3.2.0**
- **PostgreSQL** (localhost:54321)
- **Gradle** build system
- **n8n** workflow integration

## Prerequisites

- Java 17 or higher
- Gradle (or use wrapper)
- PostgreSQL running on port 54321
- n8n running on port 5678

## Quick Start

### Install Gradle Wrapper

Since Gradle is not installed, download the wrapper first:

```bash
# Download gradle wrapper
curl -L https://services.gradle.org/distributions/gradle-8.5-bin.zip -o gradle.zip
unzip gradle.zip
gradle-8.5/bin/gradle wrapper
rm -rf gradle-8.5 gradle.zip
```

Or install Gradle via Homebrew (Mac):

```bash
brew install gradle
gradle wrapper
```

### Build & Run

```bash
./gradlew build
./gradlew bootRun
```

The application will start on **http://localhost:8080**

## What's Been Created So Far

✅ Project structure (`apps/backend/`)
✅ `build.gradle` with all dependencies
✅ `settings.gradle` configuration
✅ Main application class (`RapidPhotoUploadApplication.java`)
✅ `application.yml` with database config
✅ `.gitignore` for Java projects

## Next Steps

1. Generate Gradle wrapper (see above)
2. Build the project (`./gradlew build`)
3. Run the application (`./gradlew bootRun`)
4. Implement domain layer (DDD)
5. Add CQRS handlers
6. Create upload endpoints
7. Integrate n8n webhooks

## Troubleshooting

### Gradle wrapper missing

The Gradle wrapper files (`gradlew`, `gradlew.bat`) need to be generated. See "Install Gradle Wrapper" section above.

### Port already in use

If port 8080 is already in use, change it in `src/main/resources/application.yml`:

```yaml
server:
  port: 8081
```

### Database connection failed

Ensure PostgreSQL is running:

```bash
docker ps | grep rapidphoto-postgres
```

Should show container running on port 54321.

