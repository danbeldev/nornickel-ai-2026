package com.github.danbel.api.controller;

import com.github.danbel.api.dto.entity.MentionableEntityDto;
import com.github.danbel.api.service.EntitySearchService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/entities")
public class EntityController {

    private final EntitySearchService service;

    @GetMapping("/search")
    public List<MentionableEntityDto> searchMentionableEntities(
            @RequestParam(defaultValue = "") String query,
            @RequestParam(defaultValue = "10") int limit
    ) {
        return service.search(query, limit);
    }
}
