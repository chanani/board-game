package com.boardgame.fruitstack.view;

import java.util.List;

public record FruitStackResultView(String reason, List<FruitStackStandingView> standings) {
}
