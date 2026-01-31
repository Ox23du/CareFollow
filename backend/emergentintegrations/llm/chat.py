class UserMessage:
    def __init__(self, content: str):
        self.content = content


class LlmChat:
    def __init__(self, *args, **kwargs):
        pass

    async def chat(self, messages):
        return {
            "content": "Mock response (emergentintegrations não instalado)"
        }
