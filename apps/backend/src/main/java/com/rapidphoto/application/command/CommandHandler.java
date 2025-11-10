package com.rapidphoto.application.command;

public interface CommandHandler<TCommand, TResult> {
    TResult handle(TCommand command);
}

