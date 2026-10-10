@echo off
echo ===================================================
echo   Starting Faculty Timetable System with Aiven Cloud DB
echo ===================================================

if "%JDBC_DATABASE_PASSWORD%"=="" (
    set /p JDBC_DATABASE_PASSWORD=Enter Aiven Cloud DB Password: 
)

set JDBC_DATABASE_URL=jdbc:mysql://mysql-2fe3e6d3-gimaya222-6d31.c.aivencloud.com:12525/defaultdb?useSSL=true^&trustServerCertificate=true^&allowPublicKeyRetrieval=true
set JDBC_DATABASE_DRIVER=com.mysql.cj.jdbc.Driver
set JDBC_DATABASE_USERNAME=avnadmin
set JDBC_HIBERNATE_DIALECT=org.hibernate.dialect.MySQLDialect

echo [1/2] Starting Spring Boot Backend with Aiven Cloud DB...
start "Spring Boot Backend (Aiven Cloud DB)" cmd /k "cd timetable && set JDBC_DATABASE_URL=jdbc:mysql://mysql-2fe3e6d3-gimaya222-6d31.c.aivencloud.com:12525/defaultdb?useSSL=true^&trustServerCertificate=true^&allowPublicKeyRetrieval=true && set JDBC_DATABASE_DRIVER=com.mysql.cj.jdbc.Driver && set JDBC_DATABASE_USERNAME=avnadmin && set JDBC_DATABASE_PASSWORD=%JDBC_DATABASE_PASSWORD% && set JDBC_HIBERNATE_DIALECT=org.hibernate.dialect.MySQLDialect && mvnw.cmd spring-boot:run"

echo [2/2] Starting Next.js Frontend...
start "Next.js Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ===================================================
echo Backend running on http://localhost:8080
echo Frontend running on http://localhost:3000
echo Connected to Aiven Cloud MySQL Database!
echo ===================================================
pause
