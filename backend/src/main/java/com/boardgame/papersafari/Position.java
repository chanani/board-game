package com.boardgame.papersafari;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import java.util.List;
import java.util.stream.IntStream;

public record Position(int column, int row) {

    public static final int COLUMNS = 3;
    public static final int ROWS = 2;
    private static final int TOP = 0;
    private static final int BOTTOM = 1;

    public Position {
        if (column < 0 || column >= COLUMNS || row < 0 || row >= ROWS) {
            throw new BusinessException(ErrorCode.INVALID_POSITION);
        }
    }

    public static Position top(int column) {
        return new Position(column, TOP);
    }

    public static Position bottom(int column) {
        return new Position(column, BOTTOM);
    }

    public static List<Position> all() {
        return IntStream.range(0, ROWS).boxed()
                .flatMap(row -> IntStream.range(0, COLUMNS).mapToObj(column -> new Position(column, row)))
                .toList();
    }

    public static IntStream columns() {
        return IntStream.range(0, COLUMNS);
    }
}
