package com.boardgame.papersafari.bot;

import com.boardgame.papersafari.view.BoardView;
import com.boardgame.papersafari.view.CardView;
import com.boardgame.papersafari.view.SlotView;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.IntStream;

// R26·R27: 판 점수 어림. 아는 카드(앞면·엿본 뒷면)는 그 값, 모르는 뒷면은 unknown 평균, 같은 열 같은 값은 0점,
// 와일드는 같은 줄 이웃을 복사하는 해석 중 가장 낮은 합(BoardScore와 같은 규칙).
final class BoardGuess {

    private static final int COLUMNS = 3;

    private final List<Guess> cells;
    private final double unknown;

    private BoardGuess(List<Guess> cells, double unknown) {
        this.cells = cells;
        this.unknown = unknown;
    }

    static BoardGuess of(BoardView board, double unknown) {
        List<Guess> cells = IntStream.range(0, COLUMNS * 2)
                .mapToObj(index -> Guess.of(slotAt(board, index)))
                .toList();
        return new BoardGuess(cells, unknown);
    }

    BoardGuess with(SlotView slot, CardView card) {
        List<Guess> changed = new ArrayList<>(cells);
        changed.set(indexOf(slot.column(), slot.row()), Guess.of(card));
        return new BoardGuess(List.copyOf(changed), unknown);
    }

    double worthAt(SlotView slot) {
        return at(slot.column(), slot.row()).worth(unknown);
    }

    boolean isPaired(int column) {
        return at(column, 0).pairs(at(column, 1));
    }

    double columnSum(int column) {
        return at(column, 0).worth(unknown) + at(column, 1).worth(unknown);
    }

    double total() {
        List<List<Guess>> bottoms = rowsOf(1);
        return rowsOf(0).stream()
                .flatMap(top -> bottoms.stream().map(bottom -> pairUp(top, bottom)))
                .min(Double::compare)
                .orElseThrow();
    }

    private double pairUp(List<Guess> top, List<Guess> bottom) {
        return IntStream.range(0, COLUMNS)
                .mapToDouble(column -> columnScore(top.get(column), bottom.get(column)))
                .sum();
    }

    private double columnScore(Guess top, Guess bottom) {
        if (top.pairs(bottom)) {
            return 0;
        }
        return top.worth(unknown) + bottom.worth(unknown);
    }

    // 한 줄의 와일드 해석들(와일드마다 왼쪽/오른쪽 이웃 복사). 해석이 하나도 없으면 와일드는 0점.
    private List<List<Guess>> rowsOf(int row) {
        List<List<Guess>> resolved = IntStream.range(0, 1 << COLUMNS)
                .mapToObj(mask -> resolve(row, mask))
                .flatMap(Optional::stream)
                .distinct()
                .toList();
        if (resolved.isEmpty()) {
            return List.of(zeroWilds(row));
        }
        return resolved;
    }

    private Optional<List<Guess>> resolve(int row, int mask) {
        List<Optional<Guess>> line = IntStream.range(0, COLUMNS)
                .mapToObj(column -> follow(row, column, mask, 0))
                .toList();
        if (line.stream().anyMatch(Optional::isEmpty)) {
            return Optional.empty();
        }
        return Optional.of(line.stream().map(Optional::orElseThrow).toList());
    }

    private Optional<Guess> follow(int row, int column, int mask, int depth) {
        Guess guess = at(column, row);
        if (!guess.wild()) {
            return Optional.of(guess);
        }
        int next = column + stepOf(mask, column);
        if (next < 0 || next >= COLUMNS || depth >= COLUMNS) {
            return Optional.empty();
        }
        return follow(row, next, mask, depth + 1);
    }

    private static int stepOf(int mask, int column) {
        if ((mask >> column & 1) == 1) {
            return 1;
        }
        return -1;
    }

    private List<Guess> zeroWilds(int row) {
        return IntStream.range(0, COLUMNS)
                .mapToObj(column -> at(column, row))
                .map(Guess::zeroIfWild)
                .toList();
    }

    private Guess at(int column, int row) {
        return cells.get(indexOf(column, row));
    }

    private static int indexOf(int column, int row) {
        return row * COLUMNS + column;
    }

    private static SlotView slotAt(BoardView board, int index) {
        return board.slots()
                .stream()
                .filter(slot -> indexOf(slot.column(), slot.row()) == index)
                .findFirst()
                .orElseThrow();
    }
}
