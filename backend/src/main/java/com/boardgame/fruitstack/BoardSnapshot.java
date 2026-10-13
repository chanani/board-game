package com.boardgame.fruitstack;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

// R23·R24: 판 신호의 겉모양만 본다(풀어 보지 않는다). 30비트 낱말 = 5글자, 머리 1 + 과일 최대 239개.
public record BoardSnapshot(String text) {

    private static final int WORD = 5;
    private static final int MAX_LENGTH = 1200;
    private static final Pattern ALPHABET = Pattern.compile("[A-Za-z0-9_-]+");

    public boolean isValid() {
        if (text == null || text.length() < WORD || text.length() > MAX_LENGTH || text.length() % WORD != 0) {
            return false;
        }
        Matcher matcher = ALPHABET.matcher(text);
        return matcher.matches();
    }
}
