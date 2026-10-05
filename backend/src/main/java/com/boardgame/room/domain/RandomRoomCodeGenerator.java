package com.boardgame.room.domain;

import java.security.SecureRandom;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import org.springframework.stereotype.Component;

@Component
public class RandomRoomCodeGenerator implements RoomCodeGenerator {

    private static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final int LENGTH = 6;

    private final SecureRandom random = new SecureRandom();

    @Override
    public RoomCode next() {
        String value = IntStream.range(0, LENGTH)
                .mapToObj(index -> String.valueOf(ALPHABET.charAt(random.nextInt(ALPHABET.length()))))
                .collect(Collectors.joining());
        return new RoomCode(value);
    }
}
