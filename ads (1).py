from web3 import Web3
import json
import time

# Подключение к сети
w3 = Web3(Web3.HTTPProvider('https://base-mainnet.public.blastapi.io'))

# Минимальный ABI с функцией totalSupply
MIN_ABI = [
    {
        "constant": True,
        "inputs": [],
        "name": "totalSupply",
        "outputs": [{"name": "", "type": "uint256"}],
        "type": "function"
    },
    {
        "constant": True,
        "inputs": [{"name": "tokenId", "type": "uint256"}],
        "name": "ownerOf",
        "outputs": [{"name": "", "type": "address"}],
        "type": "function"
    },
    {
        "constant": False,
        "inputs": [
            {"name": "from", "type": "address"},
            {"name": "to", "type": "address"},
            {"name": "tokenId", "type": "uint256"}
        ],
        "name": "transferFrom",
        "outputs": [],
        "type": "function"
    }
]

# Ввод данных
contract_address = w3.to_checksum_address(input("Введите адрес контракта: "))
recipient_address = w3.to_checksum_address(input("Введите адрес получателя: "))

# Читаем адреса из wallets.txt
with open('wallets.txt', 'r') as file:
    addresses = [w3.to_checksum_address(line.strip()) for line in file if line.strip()]

# Читаем приватные ключи из keys.txt
with open('keys.txt', 'r') as file:
    private_keys = [line.strip() for line in file if line.strip()]

if len(addresses) != len(private_keys):
    print("Количество адресов и приватных ключей не совпадает!")
    exit()

# Объединяем адреса и ключи
wallets = list(zip(addresses, private_keys))

# Создание контракта с минимальным ABI
contract = w3.eth.contract(address=contract_address, abi=MIN_ABI)

# Получаем текущий totalSupply
try:
    total_supply = contract.functions.totalSupply().call()
    print(f"Текущий totalSupply: {total_supply}")
except Exception as e:
    print(f"Ошибка при получении totalSupply: {e}")
    total_supply = int(input("Введите максимальный ID токена вручную: "))

# Поиск всех холдеров NFT
holders = {}
for token_id in range(total_supply):
    try:
        owner = contract.functions.ownerOf(token_id).call()
        holders[token_id] = owner
        print(f"Проверка токена {token_id}: владелец {owner}")
    except Exception as e:
        print(f"Ошибка при проверке токена {token_id}: {e}")
    time.sleep(1/140)  # Небольшая задержка между запросами

# Перевод NFT, если адрес в wallets является владельцем
for token_id, owner_address in holders.items():
    if owner_address in addresses:
        index = addresses.index(owner_address)
        private_key = private_keys[index]

        try:
            # Оценка газа для транзакции
            gas_estimate = contract.functions.transferFrom(
                owner_address, 
                recipient_address, 
                token_id
            ).estimate_gas({
                'from': owner_address
            })

            # Получаем текущую цену газа
            gas_price = w3.eth.gas_price

            # Создание транзакции с расчетным количеством газа
            transaction = contract.functions.transferFrom(
                owner_address, 
                recipient_address, 
                token_id
            ).build_transaction({
                'from': owner_address,
                'nonce': w3.eth.get_transaction_count(owner_address),
                'gas': int(gas_estimate * 1.2),  # добавляем 20% для надежности
                'gasPrice': int(gas_price * 1.2)  # добавляем 20% для надежности
            })

            # Подпись транзакции
            signed_txn = w3.eth.account.sign_transaction(transaction, private_key=private_key)

            # Отправка транзакции
            tx_hash = w3.eth.send_raw_transaction(signed_txn.rawTransaction)
            print(f"Токен {token_id} отправлен. Хэш транзакции: {w3.to_hex(tx_hash)}")
            
            # Ждем подтверждения транзакции
            tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
            print(f"Транзакция подтверждена. Статус: {'успешно' if tx_receipt['status'] == 1 else 'неуспешно'}")
            
            time.sleep(1)  # Задержка между транзакциями
            
        except Exception as e:
            print(f"Ошибка при отправке токена {token_id}: {e}")
