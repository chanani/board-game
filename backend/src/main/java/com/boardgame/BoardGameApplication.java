package com.boardgame;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;

@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
public class BoardGameApplication {

    public static void main(String[] args) {
        SpringApplication.run(BoardGameApplication.class, args);
    }
}
