package com.boardgame.chat.api;

import com.boardgame.chat.application.ChatService;
import com.boardgame.common.security.LoginMember;
import java.security.Principal;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/rooms/{code}/chat")
public class ChatController {

    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    @GetMapping
    public List<ChatMessageResponse> history(@PathVariable String code, Principal principal) {
        return chatService.history(code, LoginMember.idOf(principal)).stream()
                .map(message -> ChatMessageResponse.from(code.toUpperCase(), message))
                .toList();
    }
}
