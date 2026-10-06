package com.boardgame.papersafari;

import java.util.Comparator;
import java.util.List;
import java.util.stream.IntStream;

/** 판 점수: 와일드를 가장 유리하게 해석한 뒤 열별 점수와 합계를 낸다. */
public record BoardScore(Score total, List<Score> columns) {

    public static BoardScore of(Board board) {
        List<List<CardValue>> tops = WildResolution.candidates(rowOf(board, 0));
        List<List<CardValue>> bottoms = WildResolution.candidates(rowOf(board, 1));
        return tops.stream()
                .flatMap(top -> bottoms.stream().map(bottom -> columnsOf(top, bottom)))
                .map(BoardScore::fromColumns)
                .min(Comparator.comparing(BoardScore::total))
                .orElseThrow();
    }

    private static List<Card> rowOf(Board board, int row) {
        return Position.columns().mapToObj(column -> board.cardAt(new Position(column, row))).toList();
    }

    private static List<Score> columnsOf(List<CardValue> top, List<CardValue> bottom) {
        return IntStream.range(0, top.size()).mapToObj(index -> columnScore(top.get(index), bottom.get(index))).toList();
    }

    private static Score columnScore(CardValue top, CardValue bottom) {
        if (top.equals(bottom)) {
            return Score.ZERO;
        }
        return new Score(top.value() + bottom.value());
    }

    private static BoardScore fromColumns(List<Score> columns) {
        return new BoardScore(columns.stream().reduce(Score.ZERO, Score::plus), columns);
    }
}
