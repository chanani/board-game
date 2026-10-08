package com.boardgame.papersafari.bot;

import com.boardgame.papersafari.view.SlotView;

// 들고 있는 카드를 slot에 넣을 때: gain = 줄어드는 점수(어림), pushed = 밀려나는 카드의 어림 점수.
record Choice(SlotView slot, double gain, double pushed) {
}
