package com.boardgame.record.schema;

import java.util.regex.Pattern;

/** game_type 열에 걸린 CHECK 제약 하나(테이블과 제약 이름). */
record GameTypeCheck(String table, String name) {

    private static final String PLAIN = "[A-Za-z0-9_]+";

    /** 따옴표 없이 SQL에 쓸 수 있는 이름인지. 아니면 건드리지 않는다. */
    boolean isPlain() {
        return Pattern.matches(PLAIN, table) && Pattern.matches(PLAIN, name);
    }

    String dropSql() {
        return "alter table " + table + " drop constraint " + name;
    }
}
