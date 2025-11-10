package com.rapidphoto.application.command.user;

public class RegisterUserCommand {
    private final String email;
    private final String username;
    private final String password;
    private final String fullName;

    public RegisterUserCommand(String email, String username, String password, String fullName) {
        this.email = email;
        this.username = username;
        this.password = password;
        this.fullName = fullName;
    }

    public String getEmail() { return email; }
    public String getUsername() { return username; }
    public String getPassword() { return password; }
    public String getFullName() { return fullName; }
}

