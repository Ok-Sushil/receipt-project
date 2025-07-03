import sys
from decimal import Decimal, getcontext

getcontext().prec = 50

account_number = Decimal(sys.argv[1])
multiplier = Decimal('2840.811')

result = account_number * multiplier
cse_id = int(result)

print(cse_id)
