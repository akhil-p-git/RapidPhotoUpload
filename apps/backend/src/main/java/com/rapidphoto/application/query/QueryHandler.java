package com.rapidphoto.application.query;

public interface QueryHandler<TQuery, TResult> {
    TResult handle(TQuery query);
}

